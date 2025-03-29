// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";

contract CertifyChain {
    struct Certificate {
        string name;
        address issuer;
        address recipient;
        string ipfsHash;
        uint256 issueDate;
        bool isValid;
    }

    struct User {
        string name;
        bool isHR;
        bool isRegistered;
        bytes32[] certificateIds;
    }

    mapping(address => User) public users;
    mapping(bytes32 => Certificate) public certificates;
    
    event UserRegistered(address user, string name, bool isHR);
    event CertificateIssued(address indexed issuer, address indexed recipient, bytes32 certId, string name);
    event CertificateRevoked(bytes32 certId);

    modifier onlyRegistered() {
        require(users[msg.sender].isRegistered, "Not registered");
        _;
    }

    modifier onlyHR() {
        require(users[msg.sender].isHR, "Not an HR");
        _;
    }

    function signup(string memory _name, bool _isHR) external returns (string memory) {
        require(!users[msg.sender].isRegistered, "Already registered");
        users[msg.sender] = User(_name, _isHR, true, new bytes32[](0));
        emit UserRegistered(msg.sender, _name, _isHR);
        return "Signup successful";
    }

    function issueCertificate(address _recipient, string memory _name, string memory _ipfsHash) external onlyHR returns (string memory) {
        require(users[_recipient].isRegistered, "Recipient not registered");
        bytes32 certId = keccak256(abi.encodePacked(_name, _recipient, _ipfsHash, block.timestamp));
        certificates[certId] = Certificate(_name, msg.sender, _recipient, _ipfsHash, block.timestamp, true);
        users[_recipient].certificateIds.push(certId);
        emit CertificateIssued(msg.sender, _recipient, certId, _name);
        return "Certificate issued successfully";
    }

    function getUserCertificates() external view onlyRegistered returns (Certificate[] memory, string memory) {
        bytes32[] memory certIds = users[msg.sender].certificateIds;
        Certificate[] memory certs = new Certificate[](certIds.length);
        for (uint i = 0; i < certIds.length; i++) {
            certs[i] = certificates[certIds[i]];
        }
        return (certs, "Certificates retrieved successfully");
    }

    function verifyCertificate(bytes32 certId) external view onlyRegistered returns (string memory) {
        if (certificates[certId].isValid) {
            return "Certificate is valid";
        } else {
            return "Certificate is invalid or revoked";
        }
    }

    function checkCertificateValidity(bytes32 certId) external view onlyHR returns (string memory) {
        if (certificates[certId].isValid) {
            return "Certificate is valid";
        } else {
            return "Certificate is invalid or revoked";
        }
    }

    function revokeCertificate(bytes32 certId) external onlyHR returns (string memory) {
        require(certificates[certId].isValid, "Certificate already revoked");
        certificates[certId].isValid = false;
        emit CertificateRevoked(certId);
        return "Certificate revoked successfully";
    }
} 