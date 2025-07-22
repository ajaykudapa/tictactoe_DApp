//SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import "@openzeppelin/contracts/utils/introspection/IERC165.sol";

interface IResolver is IERC165 {
    event AddrChanged(bytes32 indexed node, address a);
    event AddressChanged(bytes32 indexed node, uint coinType, bytes newAddress);
    event TextChanged(bytes32 indexed node, string indexed key, string value);
    event ContenthashChanged(bytes32 indexed node, bytes hash);
    event NameChanged(bytes32 indexed node, string name);  

    function setAddr(bytes32 node, address addr) external;
    function setAddr(bytes32 node, uint coinType, bytes calldata addr) external;
    function setText(bytes32 node, string calldata key, string calldata value) external;
    function setContenthash(bytes32 node, bytes calldata hash) external;
    function setName(bytes32 node, string calldata name) external;  
    
    function addr(bytes32 node) external view returns (address);
    function addr(bytes32 node, uint coinType) external view returns (bytes memory);
    function text(bytes32 node, string calldata key) external view returns (string memory);
    function contenthash(bytes32 node) external view returns (bytes memory);
    function name(bytes32 node) external view returns (string memory);  
}