// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Multicallable} from "@ensdomains/ens-contracts/contracts/resolvers/Multicallable.sol";
import "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import "./interfaces/IResolver.sol";
import "./interfaces/IPushRegistry.sol";
import "./utils/Errors.sol";

contract PublicResolver is IResolver, Multicallable {
    IPNS immutable registry;
    address immutable trustedController;

    // Ethereum address storage (for backward compatibility)
    mapping(bytes32 => address) addresses;
    // Multi-chain address storage following SLIP-44 standard
    mapping(bytes32 => mapping(uint => bytes)) coinAddresses;
    mapping(bytes32 => mapping(string => string)) texts;
    mapping(bytes32 => bytes) contenthashes;
    mapping(bytes32 => string) public names;
    mapping(address => mapping(address => bool)) private _operatorApprovals;
    mapping(address => mapping(bytes32 => mapping(address => bool))) private _tokenApprovals;

    // SLIP-44 coin type for Ethereum
    uint constant private COIN_TYPE_ETH = 60;

    event ApprovalForAll(address indexed owner, address indexed operator, bool approved);
    event Approved(address owner, bytes32 indexed node, address indexed delegate, bool indexed approved);
    
    constructor(IPNS _registry, address _trustedController) {
        if (address(_registry) == address(0)) revert InvalidAddress(address(0));
        if (_trustedController == address(0)) revert InvalidAddress(address(0));

        registry = _registry;
        trustedController = _trustedController;
    }

    function isAuthorised(bytes32 node) internal view returns (bool) {
        if (msg.sender == trustedController) {
            return true;
        }
        address owner = registry.owner(node);
        return owner == msg.sender || isApprovedForAll(owner, msg.sender) || isApprovedFor(owner, node, msg.sender);
    }

    modifier authorised(bytes32 node) {
        if (!isAuthorised(node)) revert Unauthorized(msg.sender, node);
        _;
    }

    // Approval functions
    function setApprovalForAll(address operator, bool approved) external {
        if (msg.sender == operator) revert SelfApprovalNotAllowed();
        _operatorApprovals[msg.sender][operator] = approved;
        emit ApprovalForAll(msg.sender, operator, approved);
    }

    function approve(bytes32 node, address delegate, bool approved) external {
        if (msg.sender != delegate) revert InvalidAddress(delegate);
        _tokenApprovals[msg.sender][node][delegate] = approved;
        emit Approved(msg.sender, node, delegate, approved);
    }

    function isApprovedForAll(address owner, address operator) public view returns (bool) {
        return _operatorApprovals[owner][operator];
    }

    function isApprovedFor(address owner, bytes32 node, address delegate) public view returns (bool) {
        return _tokenApprovals[owner][node][delegate];
    }

    // Helper functions for address conversions
    function bytesToAddress(bytes memory b) internal pure returns (address payable) {
        if (b.length < 20) revert InvalidAddress(address(0));
        
        address addr;
        // solhint-disable-next-line no-inline-assembly
        assembly {
            addr := mload(add(b, 20))
        }
        return payable(addr);
    }

    function addressToBytes(address a) internal pure returns (bytes memory) {
        return abi.encodePacked(a);
    }

    // Multi-chain address setter
    function setAddr(bytes32 node, uint coinType, bytes calldata a) external authorised(node) {
        coinAddresses[node][coinType] = a;
        emit AddressChanged(node, coinType, a);
        
        // Special handling for ETH addresses (coin type 60)
        if (coinType == COIN_TYPE_ETH && a.length == 20) {
            address ethAddr = bytesToAddress(a);
            addresses[node] = ethAddr;
            emit AddrChanged(node, ethAddr);
        }
    }
    
    // Legacy Ethereum address setter (for backward compatibility)
    function setAddr(bytes32 node, address addr) external authorised(node) {
        addresses[node] = addr;
        coinAddresses[node][COIN_TYPE_ETH] = addressToBytes(addr);
        emit AddrChanged(node, addr);
        emit AddressChanged(node, COIN_TYPE_ETH, addressToBytes(addr));
    }

    function setText(bytes32 node, string calldata key, string calldata value) external authorised(node) {
        texts[node][key] = value;
        emit TextChanged(node, key, value);
    }

    function setContenthash(bytes32 node, bytes calldata hash) external authorised(node) {
        contenthashes[node] = hash;
        emit ContenthashChanged(node, hash);
    }

    function setName(bytes32 node, string calldata name) external authorised(node) {
        names[node] = name;
        emit NameChanged(node, name);
    }

    // Multi-chain address getter
    function addr(bytes32 node, uint coinType) public view returns (bytes memory) {
        return coinAddresses[node][coinType];
    }
    
    // Legacy Ethereum address getter (for backward compatibility)
    function addr(bytes32 node) public view returns (address) {
        return addresses[node];
    }

    function text(bytes32 node, string calldata key) public view returns (string memory) {
        return texts[node][key];
    }

    function contenthash(bytes32 node) public view returns (bytes memory) {
        return contenthashes[node];
    }

    function name(bytes32 node) public view returns (string memory) {
        return names[node];
    }

    function supportsInterface(bytes4 interfaceID) public view virtual override(Multicallable, IERC165) returns (bool) {
        return interfaceID == type(IResolver).interfaceId || super.supportsInterface(interfaceID);
    }
}
