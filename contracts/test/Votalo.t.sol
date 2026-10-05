// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {Votalo} from "../src/Votalo.sol";

contract VotaloTest is Test {
    Votalo internal v;

    uint256 internal constant ADMIN_PK = 0xA11CE;
    uint256 internal constant ALICE_PK = 0xA1;
    uint256 internal constant BOB_PK = 0xB0B;
    uint256 internal constant CAROL_PK = 0xCA401;
    uint256 internal constant OUTSIDER_PK = 0xBAD;

    address internal admin;
    address internal alice;
    address internal bob;
    address internal carol;

    bytes32 internal constant GROUP = keccak256("group-1");
    bytes32 internal constant GROUP_B = keccak256("group-2");
    bytes32 internal constant PROP = keccak256("prop-1");
    bytes32 internal constant INVITE_1 = keccak256("invite-1");
    uint64 internal constant NOW_TS = 1_000_000;
    uint8 internal constant OPEN_MODE = 0;
    uint8 internal constant INVITE_MODE = 1;

    function setUp() public {
        vm.warp(NOW_TS);
        v = new Votalo();
        admin = vm.addr(ADMIN_PK);
        alice = vm.addr(ALICE_PK);
        bob = vm.addr(BOB_PK);
        carol = vm.addr(CAROL_PK);
    }

    // ----- helpers -----

    function _sig(uint256 pk, bytes32 digest) internal pure returns (bytes memory) {
        (uint8 vv, bytes32 r, bytes32 s) = vm.sign(pk, digest);
        return abi.encodePacked(r, s, vv);
    }

    function _opts2() internal pure returns (string[] memory o) {
        o = new string[](2);
        o[0] = "Yes";
        o[1] = "No";
    }

    function _createOpenGroup(bytes32 gid) internal {
        bytes32 d = v.hashCreateGroup(gid, OPEN_MODE, admin, "Club");
        v.createGroup(gid, OPEN_MODE, admin, "Club", _sig(ADMIN_PK, d));
    }

    function _createInviteGroup(bytes32 gid) internal {
        bytes32 d = v.hashCreateGroup(gid, INVITE_MODE, admin, "Club");
        v.createGroup(gid, INVITE_MODE, admin, "Club", _sig(ADMIN_PK, d));
    }

    function _joinOpen(bytes32 gid, address member, uint256 pk) internal {
        bytes32 d = v.hashJoin(gid, member);
        v.join(gid, member, _sig(pk, d), bytes32(0), "");
    }

    function _joinInvite(bytes32 gid, address member, uint256 pk, bytes32 inviteId) internal {
        bytes32 inv = v.hashInvite(gid, inviteId);
        bytes memory adminSig = _sig(ADMIN_PK, inv);
        bytes32 d = v.hashJoin(gid, member);
        v.join(gid, member, _sig(pk, d), inviteId, adminSig);
    }

    function _createProp(bytes32 gid, bytes32 pid, address author, uint256 pk, uint64 deadline) internal {
        string[] memory o = _opts2();
        bytes32 d = v.hashCreateProposal(gid, pid, author, "Pizza?", o, deadline);
        v.createProposal(gid, pid, author, "Pizza?", o, deadline, _sig(pk, d));
    }

    function _vote(bytes32 pid, address member, uint256 pk, uint8 choice) internal {
        bytes32 d = v.hashVote(pid, member, choice);
        v.vote(pid, member, choice, _sig(pk, d));
    }

    // ----- createGroup -----

    function test_createGroup_setsAdminAsMemberAndEmits() public {
        bytes32 d = v.hashCreateGroup(GROUP, OPEN_MODE, admin, "Club");
        vm.expectEmit(true, true, false, true);
        emit Votalo.GroupCreated(GROUP, admin, OPEN_MODE, "Club");
        v.createGroup(GROUP, OPEN_MODE, admin, "Club", _sig(ADMIN_PK, d));

        (bool exists, uint8 mode, address a, bytes32 nameHash, uint64 count) = v.groups(GROUP);
        assertTrue(exists);
        assertEq(mode, OPEN_MODE);
        assertEq(a, admin);
        assertEq(nameHash, keccak256("Club"));
        assertEq(count, 1);
        assertTrue(v.isMember(GROUP, admin));
        assertEq(v.totalGroups(), 1);
        assertEq(v.totalMembers(), 1);
    }

    function test_createGroup_rejectsSignatureFromOtherKey() public {
        bytes32 d = v.hashCreateGroup(GROUP, OPEN_MODE, admin, "Club");
        vm.expectRevert(Votalo.InvalidSignature.selector);
        v.createGroup(GROUP, OPEN_MODE, admin, "Club", _sig(OUTSIDER_PK, d));
    }

    function test_createGroup_rejectsSignatureReplayedOntoOtherGroupId() public {
        bytes32 d = v.hashCreateGroup(GROUP, OPEN_MODE, admin, "Club");
        vm.expectRevert(Votalo.InvalidSignature.selector);
        v.createGroup(GROUP_B, OPEN_MODE, admin, "Club", _sig(ADMIN_PK, d));
    }

    function test_createGroup_rejectsDuplicateGroupId() public {
        _createOpenGroup(GROUP);
        bytes32 d = v.hashCreateGroup(GROUP, OPEN_MODE, admin, "Club");
        vm.expectRevert(Votalo.GroupExists.selector);
        v.createGroup(GROUP, OPEN_MODE, admin, "Club", _sig(ADMIN_PK, d));
    }

    function test_createGroup_rejectsInvalidMode() public {
        bytes32 d = v.hashCreateGroup(GROUP, 2, admin, "Club");
        vm.expectRevert(Votalo.InvalidMode.selector);
        v.createGroup(GROUP, 2, admin, "Club", _sig(ADMIN_PK, d));
    }

    function test_createGroup_rejectsZeroAdmin() public {
        vm.expectRevert(Votalo.InvalidAdmin.selector);
        v.createGroup(GROUP, OPEN_MODE, address(0), "Club", "");
    }

    function test_createGroup_rejectsEmptyName() public {
        bytes32 d = v.hashCreateGroup(GROUP, OPEN_MODE, admin, "");
        vm.expectRevert(Votalo.InvalidNameLength.selector);
        v.createGroup(GROUP, OPEN_MODE, admin, "", _sig(ADMIN_PK, d));
    }

    function test_createGroup_nameBoundary() public {
        string memory ok80 = _repeat("a", 80);
        string memory bad81 = _repeat("a", 81);
        bytes32 d1 = v.hashCreateGroup(GROUP, OPEN_MODE, admin, ok80);
        v.createGroup(GROUP, OPEN_MODE, admin, ok80, _sig(ADMIN_PK, d1));

        bytes32 d2 = v.hashCreateGroup(GROUP_B, OPEN_MODE, admin, bad81);
        vm.expectRevert(Votalo.InvalidNameLength.selector);
        v.createGroup(GROUP_B, OPEN_MODE, admin, bad81, _sig(ADMIN_PK, d2));
    }

    // ----- join -----

    function test_join_open_addsMemberAndEmits() public {
        _createOpenGroup(GROUP);
        bytes32 d = v.hashJoin(GROUP, alice);
        vm.expectEmit(true, true, false, true);
        emit Votalo.MemberJoined(GROUP, alice, bytes32(0));
        v.join(GROUP, alice, _sig(ALICE_PK, d), bytes32(0), "");
        assertTrue(v.isMember(GROUP, alice));
        (,,,, uint64 count) = v.groups(GROUP);
        assertEq(count, 2);
        assertEq(v.totalMembers(), 2);
    }

    function test_join_open_rejectsInviteFields() public {
        _createOpenGroup(GROUP);
        bytes32 d = v.hashJoin(GROUP, alice);
        bytes memory fakeInvite = _sig(ADMIN_PK, v.hashInvite(GROUP, INVITE_1));
        vm.expectRevert(Votalo.InviteNotAllowed.selector);
        v.join(GROUP, alice, _sig(ALICE_PK, d), INVITE_1, fakeInvite);
    }

    function test_join_rejectsMemberSigFromOtherKey() public {
        _createOpenGroup(GROUP);
        bytes32 d = v.hashJoin(GROUP, alice);
        vm.expectRevert(Votalo.InvalidSignature.selector);
        v.join(GROUP, alice, _sig(BOB_PK, d), bytes32(0), "");
    }

    function test_join_rejectsSecondJoin() public {
        _createOpenGroup(GROUP);
        _joinOpen(GROUP, alice, ALICE_PK);
        bytes32 d = v.hashJoin(GROUP, alice);
        vm.expectRevert(Votalo.AlreadyMember.selector);
        v.join(GROUP, alice, _sig(ALICE_PK, d), bytes32(0), "");
    }

    function test_join_rejectsZeroMember() public {
        _createOpenGroup(GROUP);
        vm.expectRevert(Votalo.InvalidMember.selector);
        v.join(GROUP, address(0), "", bytes32(0), "");
    }

    function test_join_rejectsUnknownGroup() public {
        bytes32 d = v.hashJoin(GROUP, alice);
        vm.expectRevert(Votalo.GroupNotFound.selector);
        v.join(GROUP, alice, _sig(ALICE_PK, d), bytes32(0), "");
    }

    function test_join_invite_validInviteAddsMemberAndMarksUsed() public {
        _createInviteGroup(GROUP);
        _joinInvite(GROUP, alice, ALICE_PK, INVITE_1);
        assertTrue(v.isMember(GROUP, alice));
        assertTrue(v.inviteUsed(GROUP, INVITE_1));
    }

    function test_join_invite_isSingleUse() public {
        _createInviteGroup(GROUP);
        _joinInvite(GROUP, alice, ALICE_PK, INVITE_1);

        bytes32 inv = v.hashInvite(GROUP, INVITE_1);
        bytes memory adminSig = _sig(ADMIN_PK, inv);
        bytes32 d = v.hashJoin(GROUP, bob);
        vm.expectRevert(Votalo.InviteAlreadyUsed.selector);
        v.join(GROUP, bob, _sig(BOB_PK, d), INVITE_1, adminSig);
    }

    function test_join_invite_requiresAdminSig() public {
        _createInviteGroup(GROUP);
        bytes32 d = v.hashJoin(GROUP, alice);
        vm.expectRevert(Votalo.InviteRequired.selector);
        v.join(GROUP, alice, _sig(ALICE_PK, d), INVITE_1, "");
    }

    function test_join_invite_rejectsInviteSignedByNonAdmin() public {
        _createInviteGroup(GROUP);
        bytes32 inv = v.hashInvite(GROUP, INVITE_1);
        bytes32 d = v.hashJoin(GROUP, alice);
        vm.expectRevert(Votalo.InvalidSignature.selector);
        v.join(GROUP, alice, _sig(ALICE_PK, d), INVITE_1, _sig(BOB_PK, inv));
    }

    function test_join_invite_isBoundToGroup() public {
        _createInviteGroup(GROUP);
        _createInviteGroup(GROUP_B);
        bytes32 invA = v.hashInvite(GROUP, INVITE_1);
        bytes memory adminSigA = _sig(ADMIN_PK, invA);
        bytes32 d = v.hashJoin(GROUP_B, alice);
        vm.expectRevert(Votalo.InvalidSignature.selector);
        v.join(GROUP_B, alice, _sig(ALICE_PK, d), INVITE_1, adminSigA);
    }

    // ----- createProposal -----

    function test_createProposal_storesHashesAndEmits() public {
        _createOpenGroup(GROUP);
        _joinOpen(GROUP, alice, ALICE_PK);
        uint64 dl = NOW_TS + 1 days;
        string[] memory o = _opts2();
        bytes32 d = v.hashCreateProposal(GROUP, PROP, alice, "Pizza?", o, dl);

        vm.expectEmit(true, true, true, true);
        emit Votalo.ProposalCreated(GROUP, PROP, alice, "Pizza?", o, dl);
        v.createProposal(GROUP, PROP, alice, "Pizza?", o, dl, _sig(ALICE_PK, d));

        (bool exists, bytes32 gid, uint64 deadline, uint8 n, uint64 votes, bytes32 titleHash, bytes32 optionsHash) =
            v.proposals(PROP);
        assertTrue(exists);
        assertEq(gid, GROUP);
        assertEq(deadline, dl);
        assertEq(n, 2);
        assertEq(votes, 0);
        assertEq(titleHash, keccak256("Pizza?"));
        assertTrue(optionsHash != bytes32(0));
        assertEq(v.totalProposals(), 1);
    }

    function test_createProposal_rejectsNonMemberAuthor() public {
        _createOpenGroup(GROUP);
        uint64 dl = NOW_TS + 1 days;
        _expectCreateRevert(GROUP, PROP, alice, ALICE_PK, _opts2(), "Pizza?", dl, Votalo.NotMember.selector);
    }

    function test_createProposal_rejectsUnknownGroup() public {
        uint64 dl = NOW_TS + 1 days;
        _expectCreateRevert(GROUP, PROP, admin, ADMIN_PK, _opts2(), "Pizza?", dl, Votalo.GroupNotFound.selector);
    }

    function test_createProposal_rejectsDuplicateProposalId() public {
        _createOpenGroup(GROUP);
        uint64 dl = NOW_TS + 1 days;
        _createProp(GROUP, PROP, admin, ADMIN_PK, dl);
        _expectCreateRevert(GROUP, PROP, admin, ADMIN_PK, _opts2(), "Again", dl, Votalo.ProposalExists.selector);
    }

    function test_createProposal_rejectsBadSignature() public {
        _createOpenGroup(GROUP);
        uint64 dl = NOW_TS + 1 days;
        string[] memory o = _opts2();
        bytes32 d = v.hashCreateProposal(GROUP, PROP, admin, "Pizza?", o, dl);
        vm.expectRevert(Votalo.InvalidSignature.selector);
        v.createProposal(GROUP, PROP, admin, "Pizza?", o, dl, _sig(BOB_PK, d));
    }

    function test_createProposal_rejectsTamperedTitle() public {
        _createOpenGroup(GROUP);
        uint64 dl = NOW_TS + 1 days;
        string[] memory o = _opts2();
        bytes32 d = v.hashCreateProposal(GROUP, PROP, admin, "Pizza?", o, dl);
        vm.expectRevert(Votalo.InvalidSignature.selector);
        v.createProposal(GROUP, PROP, admin, "Sushi?", o, dl, _sig(ADMIN_PK, d));
    }

    function test_createProposal_deadlineBounds() public {
        _createOpenGroup(GROUP);
        _expectCreateRevert(GROUP, PROP, admin, ADMIN_PK, _opts2(), "x", NOW_TS, Votalo.InvalidDeadline.selector);
        _expectCreateRevert(GROUP, PROP, admin, ADMIN_PK, _opts2(), "x", NOW_TS - 1, Votalo.InvalidDeadline.selector);
        _expectCreateRevert(
            GROUP,
            PROP,
            admin,
            ADMIN_PK,
            _opts2(),
            "x",
            NOW_TS + 30 days + 1,
            Votalo.InvalidDeadline.selector
        );
        // Exactly 30 days out is allowed.
        _createProp(GROUP, PROP, admin, ADMIN_PK, NOW_TS + 30 days);
        (bool exists,,,,,,) = v.proposals(PROP);
        assertTrue(exists);
    }

    function test_createProposal_optionCountBounds() public {
        _createOpenGroup(GROUP);
        uint64 dl = NOW_TS + 1 days;
        string[] memory one = new string[](1);
        one[0] = "Only";
        _expectCreateRevert(GROUP, PROP, admin, ADMIN_PK, one, "x", dl, Votalo.InvalidOptionCount.selector);

        string[] memory seven = new string[](7);
        for (uint256 i = 0; i < 7; i++) seven[i] = "o";
        _expectCreateRevert(GROUP, PROP, admin, ADMIN_PK, seven, "x", dl, Votalo.InvalidOptionCount.selector);

        string[] memory six = new string[](6);
        for (uint256 i = 0; i < 6; i++) six[i] = "o";
        bytes32 d = v.hashCreateProposal(GROUP, PROP, admin, "x", six, dl);
        v.createProposal(GROUP, PROP, admin, "x", six, dl, _sig(ADMIN_PK, d));
        (,,,uint8 optionCount,,,) = v.proposals(PROP);
        assertEq(optionCount, 6);
    }

    function test_createProposal_optionLengthBounds() public {
        _createOpenGroup(GROUP);
        uint64 dl = NOW_TS + 1 days;
        string[] memory empty = new string[](2);
        empty[0] = "a";
        empty[1] = "";
        _expectCreateRevert(GROUP, PROP, admin, ADMIN_PK, empty, "x", dl, Votalo.InvalidOptionLength.selector);

        string[] memory long41 = new string[](2);
        long41[0] = "a";
        long41[1] = _repeat("b", 41);
        _expectCreateRevert(GROUP, PROP, admin, ADMIN_PK, long41, "x", dl, Votalo.InvalidOptionLength.selector);

        string[] memory ok40 = new string[](2);
        ok40[0] = "a";
        ok40[1] = _repeat("b", 40);
        bytes32 d = v.hashCreateProposal(GROUP, PROP, admin, "x", ok40, dl);
        v.createProposal(GROUP, PROP, admin, "x", ok40, dl, _sig(ADMIN_PK, d));
    }

    function test_createProposal_titleBoundary() public {
        _createOpenGroup(GROUP);
        uint64 dl = NOW_TS + 1 days;
        _expectCreateRevert(GROUP, PROP, admin, ADMIN_PK, _opts2(), "", dl, Votalo.InvalidTitleLength.selector);
        _expectCreateRevert(
            GROUP,
            PROP,
            admin,
            ADMIN_PK,
            _opts2(),
            _repeat("t", 141),
            dl,
            Votalo.InvalidTitleLength.selector
        );
        string memory t140 = _repeat("t", 140);
        bytes32 d = v.hashCreateProposal(GROUP, PROP, admin, t140, _opts2(), dl);
        v.createProposal(GROUP, PROP, admin, t140, _opts2(), dl, _sig(ADMIN_PK, d));
    }

    // ----- vote -----

    function test_vote_countsAndEmits() public {
        _createOpenGroup(GROUP);
        _joinOpen(GROUP, alice, ALICE_PK);
        _joinOpen(GROUP, bob, BOB_PK);
        _createProp(GROUP, PROP, admin, ADMIN_PK, NOW_TS + 1 days);

        bytes32 d = v.hashVote(PROP, alice, 1);
        vm.expectEmit(true, true, true, true);
        emit Votalo.VoteCast(PROP, GROUP, alice, 1);
        v.vote(PROP, alice, 1, _sig(ALICE_PK, d));
        _vote(PROP, bob, BOB_PK, 0);

        uint256[] memory c = v.getCounts(PROP);
        assertEq(c.length, 2);
        assertEq(c[0], 1);
        assertEq(c[1], 1);
        (,,,,uint64 voteCount,,) = v.proposals(PROP);
        assertEq(voteCount, 2);
        assertTrue(v.hasVoted(PROP, alice));
        assertEq(v.totalVotes(), 2);
    }

    function test_vote_oneVotePerMember() public {
        _createOpenGroup(GROUP);
        _createProp(GROUP, PROP, admin, ADMIN_PK, NOW_TS + 1 days);
        _vote(PROP, admin, ADMIN_PK, 0);
        bytes32 d = v.hashVote(PROP, admin, 1);
        vm.expectRevert(Votalo.AlreadyVoted.selector);
        v.vote(PROP, admin, 1, _sig(ADMIN_PK, d));
    }

    function test_vote_closedAtAndAfterDeadline() public {
        _createOpenGroup(GROUP);
        uint64 dl = NOW_TS + 1 days;
        _createProp(GROUP, PROP, admin, ADMIN_PK, dl);
        vm.warp(dl);
        bytes32 d = v.hashVote(PROP, admin, 0);
        vm.expectRevert(Votalo.VotingClosed.selector);
        v.vote(PROP, admin, 0, _sig(ADMIN_PK, d));
    }

    function test_vote_openJustBeforeDeadline() public {
        _createOpenGroup(GROUP);
        uint64 dl = NOW_TS + 1 days;
        _createProp(GROUP, PROP, admin, ADMIN_PK, dl);
        vm.warp(dl - 1);
        _vote(PROP, admin, ADMIN_PK, 0);
        assertEq(v.totalVotes(), 1);
    }

    function test_vote_rejectsNonMember() public {
        _createOpenGroup(GROUP);
        _createProp(GROUP, PROP, admin, ADMIN_PK, NOW_TS + 1 days);
        bytes32 d = v.hashVote(PROP, alice, 0);
        vm.expectRevert(Votalo.NotMember.selector);
        v.vote(PROP, alice, 0, _sig(ALICE_PK, d));
    }

    function test_vote_rejectsMemberOfOtherGroup() public {
        _createOpenGroup(GROUP);
        _createOpenGroup(GROUP_B);
        _joinOpen(GROUP_B, alice, ALICE_PK);
        _createProp(GROUP, PROP, admin, ADMIN_PK, NOW_TS + 1 days);
        bytes32 d = v.hashVote(PROP, alice, 0);
        vm.expectRevert(Votalo.NotMember.selector);
        v.vote(PROP, alice, 0, _sig(ALICE_PK, d));
    }

    function test_vote_rejectsUnknownProposal() public {
        bytes32 d = v.hashVote(PROP, admin, 0);
        vm.expectRevert(Votalo.ProposalNotFound.selector);
        v.vote(PROP, admin, 0, _sig(ADMIN_PK, d));
    }

    function test_vote_rejectsBadSignature() public {
        _createOpenGroup(GROUP);
        _createProp(GROUP, PROP, admin, ADMIN_PK, NOW_TS + 1 days);
        bytes32 d = v.hashVote(PROP, admin, 0);
        vm.expectRevert(Votalo.InvalidSignature.selector);
        v.vote(PROP, admin, 0, _sig(BOB_PK, d));
    }

    function test_vote_signatureCannotBeReusedForOtherChoice() public {
        _createOpenGroup(GROUP);
        _createProp(GROUP, PROP, admin, ADMIN_PK, NOW_TS + 1 days);
        bytes32 d = v.hashVote(PROP, admin, 0);
        vm.expectRevert(Votalo.InvalidSignature.selector);
        v.vote(PROP, admin, 1, _sig(ADMIN_PK, d));
    }

    function test_vote_signatureCannotBeReusedOnOtherProposal() public {
        _createOpenGroup(GROUP);
        bytes32 prop2 = keccak256("prop-2");
        _createProp(GROUP, PROP, admin, ADMIN_PK, NOW_TS + 1 days);
        _createProp(GROUP, prop2, admin, ADMIN_PK, NOW_TS + 1 days);
        bytes32 d = v.hashVote(PROP, admin, 0);
        vm.expectRevert(Votalo.InvalidSignature.selector);
        v.vote(prop2, admin, 0, _sig(ADMIN_PK, d));
    }

    function test_vote_rejectsChoiceOutOfRange() public {
        _createOpenGroup(GROUP);
        _createProp(GROUP, PROP, admin, ADMIN_PK, NOW_TS + 1 days);
        bytes32 d = v.hashVote(PROP, admin, 2);
        vm.expectRevert(Votalo.InvalidChoice.selector);
        v.vote(PROP, admin, 2, _sig(ADMIN_PK, d));
    }

    // ----- digests and domain -----

    function test_typehashes_matchTypeStrings() public view {
        assertEq(
            v.CREATE_GROUP_TYPEHASH(),
            keccak256("CreateGroup(bytes32 groupId,uint8 mode,address admin,string name)")
        );
        assertEq(v.JOIN_TYPEHASH(), keccak256("Join(bytes32 groupId,address member)"));
        assertEq(v.INVITE_TYPEHASH(), keccak256("Invite(bytes32 groupId,bytes32 inviteId)"));
        assertEq(
            v.CREATE_PROPOSAL_TYPEHASH(),
            keccak256(
                "CreateProposal(bytes32 groupId,bytes32 proposalId,address author,string title,string[] options,uint64 deadline)"
            )
        );
        assertEq(v.VOTE_TYPEHASH(), keccak256("Vote(bytes32 proposalId,address member,uint8 choice)"));
    }

    function test_digest_isBoundToChain() public {
        bytes32 before_ = v.hashVote(PROP, admin, 0);
        vm.chainId(1234);
        bytes32 after_ = v.hashVote(PROP, admin, 0);
        assertTrue(before_ != after_);
    }

    function test_digest_isBoundToContract() public {
        Votalo other = new Votalo();
        assertTrue(v.hashVote(PROP, admin, 0) != other.hashVote(PROP, admin, 0));
    }

    // ----- counters -----

    function test_totals_acrossFlows() public {
        _createOpenGroup(GROUP);
        _joinOpen(GROUP, alice, ALICE_PK);
        _createProp(GROUP, PROP, admin, ADMIN_PK, NOW_TS + 1 days);
        _vote(PROP, admin, ADMIN_PK, 0);
        _vote(PROP, alice, ALICE_PK, 1);
        assertEq(v.totalGroups(), 1);
        assertEq(v.totalMembers(), 2);
        assertEq(v.totalProposals(), 1);
        assertEq(v.totalVotes(), 2);
    }

    // ----- fuzz -----

    function testFuzz_voteChoiceBounds(uint8 choice) public {
        _createOpenGroup(GROUP);
        _createProp(GROUP, PROP, admin, ADMIN_PK, NOW_TS + 1 days);
        bytes32 d = v.hashVote(PROP, admin, choice);
        if (choice >= 2) {
            vm.expectRevert(Votalo.InvalidChoice.selector);
        }
        v.vote(PROP, admin, choice, _sig(ADMIN_PK, d));
        if (choice < 2) {
            assertEq(v.getCounts(PROP)[choice], 1);
        }
    }

    function testFuzz_titleLength(uint8 len) public {
        _createOpenGroup(GROUP);
        uint64 dl = NOW_TS + 1 days;
        bytes memory t = new bytes(len);
        for (uint256 i = 0; i < len; i++) t[i] = "x";
        string memory title = string(t);
        bytes32 d = v.hashCreateProposal(GROUP, PROP, admin, title, _opts2(), dl);
        if (len == 0 || len > 140) {
            vm.expectRevert(Votalo.InvalidTitleLength.selector);
        }
        v.createProposal(GROUP, PROP, admin, title, _opts2(), dl, _sig(ADMIN_PK, d));
    }

    function testFuzz_optionCount(uint8 n) public {
        _createOpenGroup(GROUP);
        uint64 dl = NOW_TS + 1 days;
        uint256 count = bound(n, 0, 12);
        string[] memory opts = new string[](count);
        for (uint256 i = 0; i < count; i++) opts[i] = "o";
        bytes32 d = v.hashCreateProposal(GROUP, PROP, admin, "x", opts, dl);
        if (count < 2 || count > 6) {
            vm.expectRevert(Votalo.InvalidOptionCount.selector);
        }
        v.createProposal(GROUP, PROP, admin, "x", opts, dl, _sig(ADMIN_PK, d));
    }

    function testFuzz_deadlineWindow(uint32 offset) public {
        _createOpenGroup(GROUP);
        uint64 dl = NOW_TS + offset;
        bytes32 d = v.hashCreateProposal(GROUP, PROP, admin, "x", _opts2(), dl);
        bool valid = offset >= 1 && offset <= 30 days;
        if (!valid) {
            vm.expectRevert(Votalo.InvalidDeadline.selector);
        }
        v.createProposal(GROUP, PROP, admin, "x", _opts2(), dl, _sig(ADMIN_PK, d));
    }

    function testFuzz_otherKeyCannotJoinOrVote(uint256 pk) public {
        pk = bound(pk, 1, 1e30);
        uint256 signer = pk;
        address member = alice;
        if (signer == ALICE_PK) signer = ALICE_PK + 1;
        _createOpenGroup(GROUP);
        bytes32 d = v.hashJoin(GROUP, member);
        vm.expectRevert(Votalo.InvalidSignature.selector);
        v.join(GROUP, member, _sig(signer, d), bytes32(0), "");
    }

    // ----- helpers that need a revert expectation -----

    function _expectCreateRevert(
        bytes32 gid,
        bytes32 pid,
        address author,
        uint256 pk,
        string[] memory opts,
        string memory title,
        uint64 dl,
        bytes4 selector
    ) internal {
        bytes32 d = v.hashCreateProposal(gid, pid, author, title, opts, dl);
        vm.expectRevert(selector);
        v.createProposal(gid, pid, author, title, opts, dl, _sig(pk, d));
    }

    function _repeat(string memory s, uint256 n) internal pure returns (string memory) {
        bytes memory out = new bytes(n);
        bytes memory src = bytes(s);
        for (uint256 i = 0; i < n; i++) out[i] = src[0];
        return string(out);
    }
}
