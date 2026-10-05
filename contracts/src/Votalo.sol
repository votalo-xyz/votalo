// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/// @title Votalo
/// @notice Group decisions on Monad. Every action is authorized by an EIP-712 signature from the
/// acting member's per-group key. The relayer pays gas and never holds user keys or funds.
/// @dev Replay protection comes from unique keys: a group id, invite id, proposal id, and a
/// one-vote-per-member rule. Each signed action can succeed at most once. The domain binds
/// signatures to this chain and this contract.
contract Votalo is EIP712 {
    uint8 public constant MODE_OPEN = 0;
    uint8 public constant MODE_INVITE = 1;

    uint256 public constant MIN_OPTIONS = 2;
    uint256 public constant MAX_OPTIONS = 6;
    uint256 public constant MAX_TITLE_BYTES = 140;
    uint256 public constant MAX_OPTION_BYTES = 40;
    uint256 public constant MAX_NAME_BYTES = 80;
    uint256 public constant MAX_PROPOSAL_WINDOW = 30 days;

    struct Group {
        bool exists;
        uint8 mode;
        address admin;
        bytes32 nameHash;
        uint64 memberCount;
    }

    struct Proposal {
        bool exists;
        bytes32 groupId;
        uint64 deadline;
        uint8 optionCount;
        uint64 voteCount;
        bytes32 titleHash;
        bytes32 optionsHash;
    }

    mapping(bytes32 groupId => Group) public groups;
    mapping(bytes32 groupId => mapping(address member => bool)) public isMember;
    mapping(bytes32 groupId => mapping(bytes32 inviteId => bool)) public inviteUsed;
    mapping(bytes32 proposalId => Proposal) public proposals;
    mapping(bytes32 proposalId => uint256[MAX_OPTIONS]) private _counts;
    mapping(bytes32 proposalId => mapping(address member => bool)) public hasVoted;

    uint256 public totalGroups;
    uint256 public totalMembers;
    uint256 public totalProposals;
    uint256 public totalVotes;

    bytes32 public constant CREATE_GROUP_TYPEHASH =
        keccak256("CreateGroup(bytes32 groupId,uint8 mode,address admin,string name)");
    bytes32 public constant JOIN_TYPEHASH = keccak256("Join(bytes32 groupId,address member)");
    bytes32 public constant INVITE_TYPEHASH = keccak256("Invite(bytes32 groupId,bytes32 inviteId)");
    bytes32 public constant CREATE_PROPOSAL_TYPEHASH = keccak256(
        "CreateProposal(bytes32 groupId,bytes32 proposalId,address author,string title,string[] options,uint64 deadline)"
    );
    bytes32 public constant VOTE_TYPEHASH = keccak256("Vote(bytes32 proposalId,address member,uint8 choice)");

    event GroupCreated(bytes32 indexed groupId, address indexed admin, uint8 mode, string name);
    event MemberJoined(bytes32 indexed groupId, address indexed member, bytes32 inviteId);
    event ProposalCreated(
        bytes32 indexed groupId,
        bytes32 indexed proposalId,
        address indexed author,
        string title,
        string[] options,
        uint64 deadline
    );
    event VoteCast(bytes32 indexed proposalId, bytes32 indexed groupId, address indexed member, uint8 choice);

    error GroupExists();
    error GroupNotFound();
    error InvalidMode();
    error InvalidAdmin();
    error InvalidMember();
    error InvalidNameLength();
    error NotMember();
    error AlreadyMember();
    error InvalidSignature();
    error InviteRequired();
    error InviteNotAllowed();
    error InviteAlreadyUsed();
    error ProposalExists();
    error ProposalNotFound();
    error InvalidTitleLength();
    error InvalidOptionCount();
    error InvalidOptionLength();
    error InvalidDeadline();
    error VotingClosed();
    error AlreadyVoted();
    error InvalidChoice();

    constructor() EIP712("Votalo", "1") {}

    // ---------------------------------------------------------------------
    // Groups
    // ---------------------------------------------------------------------

    /// @notice Creates a group. The admin signs CreateGroup and becomes its first member.
    function createGroup(
        bytes32 groupId,
        uint8 mode,
        address admin,
        string calldata name,
        bytes calldata adminSig
    ) external {
        if (groups[groupId].exists) revert GroupExists();
        if (mode != MODE_OPEN && mode != MODE_INVITE) revert InvalidMode();
        if (admin == address(0)) revert InvalidAdmin();
        uint256 nameLen = bytes(name).length;
        if (nameLen == 0 || nameLen > MAX_NAME_BYTES) revert InvalidNameLength();

        bytes32 digest = hashCreateGroup(groupId, mode, admin, name);
        if (_recover(digest, adminSig) != admin) revert InvalidSignature();

        groups[groupId] = Group({
            exists: true,
            mode: mode,
            admin: admin,
            nameHash: keccak256(bytes(name)),
            memberCount: 1
        });
        isMember[groupId][admin] = true;
        totalGroups += 1;
        totalMembers += 1;

        emit GroupCreated(groupId, admin, mode, name);
        emit MemberJoined(groupId, admin, bytes32(0));
    }

    /// @notice Adds a member. OPEN groups need no invite. INVITE groups need a single-use invite
    /// signed by the group admin. The member signs Join to prove control of its key.
    function join(
        bytes32 groupId,
        address member,
        bytes calldata memberSig,
        bytes32 inviteId,
        bytes calldata adminInviteSig
    ) external {
        Group storage g = groups[groupId];
        if (!g.exists) revert GroupNotFound();
        if (member == address(0)) revert InvalidMember();
        if (isMember[groupId][member]) revert AlreadyMember();

        if (g.mode == MODE_OPEN) {
            if (inviteId != bytes32(0) || adminInviteSig.length != 0) revert InviteNotAllowed();
        } else {
            if (adminInviteSig.length == 0) revert InviteRequired();
            if (inviteUsed[groupId][inviteId]) revert InviteAlreadyUsed();
            if (_recover(hashInvite(groupId, inviteId), adminInviteSig) != g.admin) revert InvalidSignature();
            inviteUsed[groupId][inviteId] = true;
        }

        if (_recover(hashJoin(groupId, member), memberSig) != member) revert InvalidSignature();

        isMember[groupId][member] = true;
        g.memberCount += 1;
        totalMembers += 1;

        emit MemberJoined(groupId, member, inviteId);
    }

    // ---------------------------------------------------------------------
    // Proposals
    // ---------------------------------------------------------------------

    /// @notice Creates a proposal. The author must be a group member and sign CreateProposal.
    function createProposal(
        bytes32 groupId,
        bytes32 proposalId,
        address author,
        string calldata title,
        string[] calldata options,
        uint64 deadline,
        bytes calldata authorSig
    ) external {
        Group storage g = groups[groupId];
        if (!g.exists) revert GroupNotFound();
        if (!isMember[groupId][author]) revert NotMember();
        if (proposals[proposalId].exists) revert ProposalExists();

        uint256 titleLen = bytes(title).length;
        if (titleLen == 0 || titleLen > MAX_TITLE_BYTES) revert InvalidTitleLength();
        if (options.length < MIN_OPTIONS || options.length > MAX_OPTIONS) revert InvalidOptionCount();
        for (uint256 i = 0; i < options.length; i++) {
            uint256 len = bytes(options[i]).length;
            if (len == 0 || len > MAX_OPTION_BYTES) revert InvalidOptionLength();
        }
        if (deadline <= block.timestamp || deadline > block.timestamp + MAX_PROPOSAL_WINDOW) {
            revert InvalidDeadline();
        }

        if (_recover(hashCreateProposal(groupId, proposalId, author, title, options, deadline), authorSig) != author) {
            revert InvalidSignature();
        }

        proposals[proposalId] = Proposal({
            exists: true,
            groupId: groupId,
            deadline: deadline,
            // forge-lint: disable-next-line(unsafe-typecast) -- length is bounded to MAX_OPTIONS (6) above
            optionCount: uint8(options.length),
            voteCount: 0,
            titleHash: keccak256(bytes(title)),
            optionsHash: _hashStrings(options)
        });
        totalProposals += 1;

        emit ProposalCreated(groupId, proposalId, author, title, options, deadline);
    }

    /// @notice Casts one final vote. The member must belong to the proposal's group, vote before the
    /// deadline, and sign Vote.
    function vote(bytes32 proposalId, address member, uint8 choice, bytes calldata memberSig) external {
        Proposal storage p = proposals[proposalId];
        if (!p.exists) revert ProposalNotFound();
        // forge-lint: disable-next-line(block-timestamp) -- deadline is a coarse close time, not a randomness source
        if (block.timestamp >= p.deadline) revert VotingClosed();
        if (!isMember[p.groupId][member]) revert NotMember();
        if (hasVoted[proposalId][member]) revert AlreadyVoted();
        if (choice >= p.optionCount) revert InvalidChoice();

        if (_recover(hashVote(proposalId, member, choice), memberSig) != member) revert InvalidSignature();

        hasVoted[proposalId][member] = true;
        _counts[proposalId][choice] += 1;
        p.voteCount += 1;
        totalVotes += 1;

        emit VoteCast(proposalId, p.groupId, member, choice);
    }

    /// @notice Per-option counts for a proposal, length equal to its option count.
    function getCounts(bytes32 proposalId) external view returns (uint256[] memory counts) {
        uint256 n = proposals[proposalId].optionCount;
        counts = new uint256[](n);
        for (uint256 i = 0; i < n; i++) {
            counts[i] = _counts[proposalId][i];
        }
    }

    // ---------------------------------------------------------------------
    // EIP-712 digests (public so clients and tests can check them)
    // ---------------------------------------------------------------------

    function hashCreateGroup(bytes32 groupId, uint8 mode, address admin, string calldata name)
        public
        view
        returns (bytes32)
    {
        return _hashTypedDataV4(
            keccak256(
                abi.encode(CREATE_GROUP_TYPEHASH, groupId, mode, admin, keccak256(bytes(name)))
            )
        );
    }

    function hashJoin(bytes32 groupId, address member) public view returns (bytes32) {
        return _hashTypedDataV4(keccak256(abi.encode(JOIN_TYPEHASH, groupId, member)));
    }

    function hashInvite(bytes32 groupId, bytes32 inviteId) public view returns (bytes32) {
        return _hashTypedDataV4(keccak256(abi.encode(INVITE_TYPEHASH, groupId, inviteId)));
    }

    function hashCreateProposal(
        bytes32 groupId,
        bytes32 proposalId,
        address author,
        string calldata title,
        string[] calldata options,
        uint64 deadline
    ) public view returns (bytes32) {
        return _hashTypedDataV4(
            keccak256(
                abi.encode(
                    CREATE_PROPOSAL_TYPEHASH,
                    groupId,
                    proposalId,
                    author,
                    keccak256(bytes(title)),
                    _hashStrings(options),
                    deadline
                )
            )
        );
    }

    function hashVote(bytes32 proposalId, address member, uint8 choice) public view returns (bytes32) {
        return _hashTypedDataV4(keccak256(abi.encode(VOTE_TYPEHASH, proposalId, member, choice)));
    }

    // ---------------------------------------------------------------------
    // Internal helpers
    // ---------------------------------------------------------------------

    /// @dev EIP-712 encoding of string[]: keccak256 of the concatenated keccak256 of each element.
    function _hashStrings(string[] memory items) internal pure returns (bytes32) {
        bytes32[] memory hashes = new bytes32[](items.length);
        for (uint256 i = 0; i < items.length; i++) {
            hashes[i] = keccak256(bytes(items[i]));
        }
        return keccak256(abi.encodePacked(hashes));
    }

    /// @dev Recovers the signer. ECDSA.recover reverts on malformed or high-s signatures.
    function _recover(bytes32 digest, bytes calldata sig) internal pure returns (address) {
        return ECDSA.recover(digest, sig);
    }
}
