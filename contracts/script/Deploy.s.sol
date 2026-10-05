// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Script, console2} from "forge-std/Script.sol";
import {Votalo} from "../src/Votalo.sol";

/// @notice Deploys Votalo. Run with `script/deploy-testnet.sh`, which sets an explicit gas limit.
contract Deploy is Script {
    function run() external returns (Votalo votalo) {
        vm.startBroadcast();
        votalo = new Votalo();
        vm.stopBroadcast();
        console2.log("Votalo deployed at", address(votalo));
        console2.log("chainId", block.chainid);
    }
}
