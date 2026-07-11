// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract VotingSystem {
    enum Phase { Setup, Voting, Ended }
    Phase public currentPhase;
    address public owner;

    struct Candidate {
        uint256 id;
        string name;
        string party;
        uint256 voteCount;
        bool isActive;
    }

    struct Voter {
        bool isRegistered;
        bool hasVoted;
        uint256 votedCandidateId;
    }

    uint256 public currentElectionId;
    mapping(uint256 => mapping(address => Voter)) public electionsVoters;
    mapping(uint256 => Candidate[]) public electionsCandidates;
    mapping(uint256 => uint256) public totalVotesCast;
    mapping(uint256 => uint256) public votingStart;
    mapping(uint256 => uint256) public votingEnd;

    mapping(address => bool) public admins;
    uint256 public registeredVoterCount;
    bool public paused;

    event VoterRegistered(address indexed voter);
    event VoteCast(address indexed voter, uint256 indexed candidateId, uint256 timestamp);
    event CandidateAdded(uint256 indexed candidateId, string name, string party);
    event PhaseChanged(Phase newPhase, uint256 timestamp);
    event AdminAdded(address indexed admin);
    event AdminRemoved(address indexed admin);
    event ContractPaused(address indexed by);
    event ContractUnpaused(address indexed by);
    event NewElectionStarted(uint256 indexed electionId, uint256 timestamp);
    event CandidateStatusChanged(uint256 indexed electionId, uint256 indexed candidateId, bool isActive);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this");
        _;
    }

    modifier onlyAdmin() {
        require(msg.sender == owner || admins[msg.sender], "Only admin can call this");
        _;
    }

    modifier whenNotPaused() {
        require(!paused, "Contract is paused");
        _;
    }

    constructor() {
        owner = msg.sender;
        currentPhase = Phase.Setup;
        currentElectionId = 1;
    }

    function addAdmin(address _admin) external onlyOwner {
        admins[_admin] = true;
        emit AdminAdded(_admin);
    }

    function removeAdmin(address _admin) external onlyOwner {
        admins[_admin] = false;
        emit AdminRemoved(_admin);
    }

    function isAdmin(address _addr) external view returns (bool) {
        return _addr == owner || admins[_addr];
    }

    function pause() external onlyAdmin {
        paused = true;
        emit ContractPaused(msg.sender);
    }

    function unpause() external onlyAdmin {
        paused = false;
        emit ContractUnpaused(msg.sender);
    }

    function addCandidate(string memory _name, string memory _party) external onlyAdmin whenNotPaused {
        require(currentPhase == Phase.Setup, "Can only add candidates during setup phase");
        uint256 newId = electionsCandidates[currentElectionId].length + 1;
        electionsCandidates[currentElectionId].push(Candidate(newId, _name, _party, 0, true));
        emit CandidateAdded(newId, _name, _party);
    }

    function setCandidateStatus(uint256 _candidateId, bool _isActive) external onlyAdmin whenNotPaused {
        require(_candidateId > 0 && _candidateId <= electionsCandidates[currentElectionId].length, "Invalid candidate ID");
        electionsCandidates[currentElectionId][_candidateId - 1].isActive = _isActive;
        emit CandidateStatusChanged(currentElectionId, _candidateId, _isActive);
    }

    function registerVoter(address _voter) external onlyAdmin whenNotPaused {
        require(!electionsVoters[currentElectionId][_voter].isRegistered, "Voter already registered");
        electionsVoters[currentElectionId][_voter].isRegistered = true;
        registeredVoterCount++;
        emit VoterRegistered(_voter);
    }

    function registerVotersBatch(address[] calldata _voterList) external onlyAdmin whenNotPaused {
        for(uint i = 0; i < _voterList.length; i++) {
            if(!electionsVoters[currentElectionId][_voterList[i]].isRegistered) {
                electionsVoters[currentElectionId][_voterList[i]].isRegistered = true;
                registeredVoterCount++;
                emit VoterRegistered(_voterList[i]);
            }
        }
    }

    function startVoting(uint256 _durationInMinutes) external onlyAdmin whenNotPaused {
        require(currentPhase == Phase.Setup, "Cannot start voting from current phase");
        require(electionsCandidates[currentElectionId].length > 0, "No candidates registered");
        currentPhase = Phase.Voting;
        votingStart[currentElectionId] = block.timestamp;
        votingEnd[currentElectionId] = block.timestamp + (_durationInMinutes * 1 minutes);
        emit PhaseChanged(Phase.Voting, block.timestamp);
    }

    function endVoting() external onlyAdmin whenNotPaused {
        require(currentPhase == Phase.Voting, "Not in voting phase");
        currentPhase = Phase.Ended;
        emit PhaseChanged(Phase.Ended, block.timestamp);
    }

    function startNewElection() external onlyAdmin whenNotPaused {
        require(currentPhase == Phase.Ended, "Current election must end first");
        currentElectionId++;
        currentPhase = Phase.Setup;
        emit NewElectionStarted(currentElectionId, block.timestamp);
        emit PhaseChanged(Phase.Setup, block.timestamp);
    }

    function castVote(uint256 _candidateId) external whenNotPaused {
        require(currentPhase == Phase.Voting, "Not in voting phase");
        require(block.timestamp <= votingEnd[currentElectionId], "Voting period has ended");
        require(electionsVoters[currentElectionId][msg.sender].isRegistered, "Voter not registered");
        require(!electionsVoters[currentElectionId][msg.sender].hasVoted, "Voter already voted");
        require(_candidateId > 0 && _candidateId <= electionsCandidates[currentElectionId].length, "Invalid candidate ID");
        require(electionsCandidates[currentElectionId][_candidateId - 1].isActive, "Candidate is not active");

        electionsVoters[currentElectionId][msg.sender].hasVoted = true;
        electionsVoters[currentElectionId][msg.sender].votedCandidateId = _candidateId;
        electionsCandidates[currentElectionId][_candidateId - 1].voteCount++;
        totalVotesCast[currentElectionId]++;

        emit VoteCast(msg.sender, _candidateId, block.timestamp);
    }

    function getVoterStatus(address _voter) external view returns (bool isRegistered, bool hasVoted, uint256 votedCandidateId) {
        Voter memory v = electionsVoters[currentElectionId][_voter];
        return (v.isRegistered, v.hasVoted, v.votedCandidateId);
    }

    function getCandidate(uint256 _candidateId) external view returns (uint256 id, string memory name, string memory party, uint256 voteCount, bool isActive) {
        require(_candidateId > 0 && _candidateId <= electionsCandidates[currentElectionId].length, "Invalid candidate ID");
        Candidate memory c = electionsCandidates[currentElectionId][_candidateId - 1];
        return (c.id, c.name, c.party, c.voteCount, c.isActive);
    }

    function getAllCandidates() external view returns (Candidate[] memory) {
        return electionsCandidates[currentElectionId];
    }

    function candidatesCount() external view returns (uint256) {
        return electionsCandidates[currentElectionId].length;
    }

    function getWinner() external view returns (uint256 winnerId, string memory name, uint256 voteCount) {
        require(currentPhase == Phase.Ended, "Voting not ended");
        uint256 maxVotes = 0;
        uint256 winningCandidateId = 0;

        for (uint256 i = 0; i < electionsCandidates[currentElectionId].length; i++) {
            if (electionsCandidates[currentElectionId][i].voteCount > maxVotes) {
                maxVotes = electionsCandidates[currentElectionId][i].voteCount;
                winningCandidateId = electionsCandidates[currentElectionId][i].id;
            }
        }

        require(winningCandidateId > 0, "No votes cast");
        Candidate memory winner = electionsCandidates[currentElectionId][winningCandidateId - 1];
        return (winner.id, winner.name, winner.voteCount);
    }

    function getTimeRemaining() external view returns (uint256) {
        if (currentPhase != Phase.Voting) return 0;
        if (block.timestamp >= votingEnd[currentElectionId]) return 0;
        return votingEnd[currentElectionId] - block.timestamp;
    }
}
