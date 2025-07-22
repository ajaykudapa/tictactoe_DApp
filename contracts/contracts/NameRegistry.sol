// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./utils/Errors.sol";

/**
 * @title NameRegistry
 * @dev A registry that maps tokenIds to their original names, enabling reverse lookups
 * This solves the fundamental issue where names are hashed into tokenIds but can't be reversed
 */
contract NameRegistry is Ownable {
    // Maps tokenIds to their original names
    mapping(uint256 => string) private _tokenIdToName;
    
    // Controllers authorized to update the registry
    mapping(address => bool) public controllers;
    
    // Events
    event NameRegistered(uint256 indexed tokenId, string name);
    event ControllerAdded(address indexed controller);
    event ControllerRemoved(address indexed controller);
    
    /**
     * @dev Modifier to restrict function access to authorized controllers
     */
    modifier onlyController() {
        if (!controllers[msg.sender]) revert Unauthorized(msg.sender, bytes32(0));
        _;
    }
    
    /**
     * @dev Constructor
     * Sets the deployer as initial controller
     */
    constructor() {
        controllers[msg.sender] = true;
        emit ControllerAdded(msg.sender);
    }
    
    /**
     * @dev Adds a new controller
     * @param controller Address to add as controller
     */
    function addController(address controller) external onlyOwner {
        if (controller == address(0)) revert InvalidAddress(address(0));
        if (controllers[controller]) revert AlreadyRegistered();
        
        controllers[controller] = true;
        emit ControllerAdded(controller);
    }
    
    /**
     * @dev Removes a controller
     * @param controller Address to remove as controller
     */
    function removeController(address controller) external onlyOwner {
        if (!controllers[controller]) revert NotRegistered();
        
        controllers[controller] = false;
        emit ControllerRemoved(controller);
    }
    
    /**
     * @dev Registers a name-to-tokenId mapping
     * @param tokenId The token ID (derived from hash of the name)
     * @param name The original name string
     */
    function registerName(uint256 tokenId, string calldata name) external onlyController {
        if (bytes(_tokenIdToName[tokenId]).length > 0) revert AlreadyRegistered();
        if (bytes(name).length == 0) revert EmptyName();
        
        _tokenIdToName[tokenId] = name;
        emit NameRegistered(tokenId, name);
    }
    
    /**
     * @dev Updates a name for an existing tokenId - only used in special cases
     * @param tokenId The token ID to update
     * @param name The new name
     */
    function updateName(uint256 tokenId, string calldata name) external onlyController {
        if (bytes(_tokenIdToName[tokenId]).length == 0) revert NotRegistered();
        if (bytes(name).length == 0) revert EmptyName();
        
        _tokenIdToName[tokenId] = name;
        emit NameRegistered(tokenId, name);
    }
    
    /**
     * @dev Gets a name by its tokenId
     * @param tokenId The token ID to look up
     * @return The original name string
     */
    function getNameByTokenId(uint256 tokenId) external view returns (string memory) {
        return _tokenIdToName[tokenId];
    }
    
    /**
     * @dev Checks if a tokenId has a name registered
     * @param tokenId The token ID to check
     * @return True if the tokenId has a name, false otherwise
     */
    function hasName(uint256 tokenId) external view returns (bool) {
        return bytes(_tokenIdToName[tokenId]).length > 0;
    }
}
