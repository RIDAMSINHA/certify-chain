// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";

contract CertificateRegistry {
    struct Certificate {
        string name;        // Name of recipient
        address issuer;     // Organization issuing the certificate
        address recipient;  // Address of the recipient
        string ipfsHash;    // IPFS link to detailed certificate
        uint256 issueDate;  // Timestamp of issuance
        bool isValid;       // Status of certificate (valid/revoked)
    }

    mapping(bytes32 => Certificate) public certificates;

    event CertificateIssued(
        address indexed issuer,
        address indexed recipient,
        bytes32 certId,
        string name
    );

    // Updated to return the certificate ID
    function issueCertificate(
        string memory name,
        address recipient,
        string memory ipfsHash
    ) public returns (bytes32) {
        bytes32 certId = keccak256(abi.encodePacked(name, recipient, ipfsHash, block.timestamp));
        certificates[certId] = Certificate(name, msg.sender, recipient, ipfsHash, block.timestamp, true);
        emit CertificateIssued(msg.sender, recipient, certId, name);
        return certId;
    }

    function verifyCertificate(bytes32 certId) public view returns (bool) {
        return certificates[certId].isValid;
    }
}
