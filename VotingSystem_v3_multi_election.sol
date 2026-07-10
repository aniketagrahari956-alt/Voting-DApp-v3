// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title VotingSystem
 * @dev A blockchain-based voting system supporting multiple election rounds.
 *
 * Key design decisions:
 * - Voter eligibility (`registeredVoters`) is GLOBAL and persists across
 *   elections — once approved, a voter does not need to be re-registered
 *   for every new election.
 * - Candidates, vote tallies, and "has this address voted" are all scoped
 *   per `electionId`, so starting a new election simply increments the
 *   counter — no data is deleted, old rounds remain fully queryable.
 * - Candidates can be deactivated (`isActive = false`) by an admin during
 *   Registration (acts as "remove") or during Voting (acts as "pause/
 *   withdraw" — already-cast votes for them are preserved, but no new
 *   votes can be cast for them).
 */
contract VotingSystem {
    // ---------------------------------------------------------------
    // Enums & Structs
    // ---------------------------------------------------------------

    enum Phase { Registration, Voting, Ended }

    struct Candidate {
        uint256 id;
        string name;
        string party;
        uint256 voteCount;
        bool isActive;
    }

    // ---------------------------------------------------------------
    // Global state (persists across all elections)
    // ---------------------------------------------------------------

    address public owner;
    mapping(address => bool) public admins;
    bool public paused;

    mapping(address => bool) public registeredVoters;
    uint256 public registeredVoterCount;

    uint256 public currentElectionId;
    Phase public currentPhase;

    // ---------------------------------------------------------------
    // Per-election state (all keyed by electionId, so history is kept)
    // ---------------------------------------------------------------

    mapping(uint256 => uint256) public votingStart;
    mapping(uint256 => uint256) public votingEnd;
    mapping(uint256 => uint256) public candidatesCount;
    mapping(uint256 => mapping(uint256 => Candidate)) public candidates;
    mapping(uint256 => uint256) public totalVotesCast;
    mapping(uint256 => mapping(address => bool)) public hasVotedInElection;
    mapping(uint256 => mapping(address => uint256)) public votedCandidateInElection;

    // ---------------------------------------------------------------
    // Events
    // ---------------------------------------------------------------

    event AdminAdded(address indexed admin);
    event AdminRemoved(address indexed admin);
    event VoterRegistered(address indexed voter);
    event CandidateAdded(uint256 indexed electionId, uint256 indexed candidateId, string name, string party);
    event CandidateStatusChanged(uint256 indexed electionId, uint256 indexed candidateId, bool isActive);
    event PhaseChanged(uint256 indexed electionId, Phase newPhase, uint256 timestamp);
    event VoteCast(uint256 indexed electionId, address indexed voter, uint256 indexed candidateId, uint256 timestamp);
    event NewElectionStarted(uint256 indexed electionId, uint256 timestamp);
    event ContractPaused(address indexed by);
    event ContractUnpaused(address indexed by);

    // ---------------------------------------------------------------
    // Modifiers
    // ---------------------------------------------------------------

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can perform this action");
        _;
    }

    modifier onlyAdmin() {
        require(admins[msg.sender], "Only admin can perform this action");
        _;
    }

    modifier whenNotPaused() {
        require(!paused, "Contract is currently paused");
        _;
    }

    modifier inPhase(Phase _phase) {
        require(currentPhase == _phase, "Action not allowed in current phase");
        _;
    }

    // ---------------------------------------------------------------
    // Constructor
    // ---------------------------------------------------------------

    constructor() {
        owner = msg.sender;
        admins[msg.sender] = true;
        currentElectionId = 1;
        currentPhase = Phase.Registration;
        emit AdminAdded(msg.sender);
    }

    // ---------------------------------------------------------------
    // Admin management
    // ---------------------------------------------------------------

    function addAdmin(address _admin) external onlyOwner {
        require(_admin != address(0), "Invalid address");
        require(!admins[_admin], "Already an admin");
        admins[_admin] = true;
        emit AdminAdded(_admin);
    }

    function removeAdmin(address _admin) external onlyOwner {
        require(_admin != owner, "Cannot remove owner");
        require(admins[_admin], "Not an admin");
        admins[_admin] = false;
        emit AdminRemoved(_admin);
    }

    function pause() external onlyOwner {
        paused = true;
        emit ContractPaused(msg.sender);
    }

    function unpause() external onlyOwner {
        paused = false;
        emit ContractUnpaused(msg.sender);
    }

    // ---------------------------------------------------------------
    // Voter registration (GLOBAL — not tied to a specific election)
    // ---------------------------------------------------------------

    function registerVoter(address _voter) public onlyAdmin whenNotPaused {
        require(_voter != address(0), "Invalid address");
        require(!registeredVoters[_voter], "Voter already registered");
        registeredVoters[_voter] = true;
        registeredVoterCount++;
        emit VoterRegistered(_voter);
    }

    function registerVotersBatch(address[] calldata _voterList) external onlyAdmin whenNotPaused {
        for (uint256 i = 0; i < _voterList.length; i++) {
            if (!registeredVoters[_voterList[i]] && _voterList[i] != address(0)) {
                registeredVoters[_voterList[i]] = true;
                registeredVoterCount++;
                emit VoterRegistered(_voterList[i]);
            }
        }
    }

    // ---------------------------------------------------------------
    // Candidate management (scoped to currentElectionId)
    // ---------------------------------------------------------------

    function addCandidate(string calldata _name, string calldata _party)
        external
        onlyAdmin
        whenNotPaused
        inPhase(Phase.Registration)
    {
        require(bytes(_name).length > 0, "Name required");
        candidatesCount[currentElectionId]++;
        uint256 newId = candidatesCount[currentElectionId];
        candidates[currentElectionId][newId] = Candidate(newId, _name, _party, 0, true);
        emit CandidateAdded(currentElectionId, newId, _name, _party);
    }

    /// @dev During Registration this effectively "removes" a candidate from the
    /// visible ballot. During Voting it acts as a withdrawal/pause — already-cast
    /// votes for them remain counted, but no further votes can be cast for them.
    function setCandidateActive(uint256 _candidateId, bool _isActive)
        external
        onlyAdmin
        whenNotPaused
    {
        require(
            currentPhase == Phase.Registration || currentPhase == Phase.Voting,
            "No active election to modify"
        );
        require(_candidateId > 0 && _candidateId <= candidatesCount[currentElectionId], "Invalid candidate");
        candidates[currentElectionId][_candidateId].isActive = _isActive;
        emit CandidateStatusChanged(currentElectionId, _candidateId, _isActive);
    }

    // ---------------------------------------------------------------
    // Phase transitions
    // ---------------------------------------------------------------

    function startVoting(uint256 _durationInMinutes)
        external
        onlyAdmin
        whenNotPaused
        inPhase(Phase.Registration)
    {
        require(_durationInMinutes > 0, "Duration must be positive");

        uint256 activeCount = 0;
        for (uint256 i = 1; i <= candidatesCount[currentElectionId]; i++) {
            if (candidates[currentElectionId][i].isActive) {
                activeCount++;
            }
        }
        require(activeCount >= 2, "Need at least 2 active candidates");

        votingStart[currentElectionId] = block.timestamp;
        votingEnd[currentElectionId] = block.timestamp + (_durationInMinutes * 1 minutes);
        currentPhase = Phase.Voting;
        emit PhaseChanged(currentElectionId, Phase.Voting, block.timestamp);
    }

    function endVoting() external onlyAdmin inPhase(Phase.Voting) {
        currentPhase = Phase.Ended;
        emit PhaseChanged(currentElectionId, Phase.Ended, block.timestamp);
    }

    /// @dev Starts a fresh election round. All candidate and vote data for the
    /// new round starts empty (new electionId), while the previous round's data
    /// stays permanently readable via its own electionId. Registered voters do
    /// NOT need to be re-registered — eligibility is global.
    function startNewElection() external onlyAdmin whenNotPaused inPhase(Phase.Ended) {
        currentElectionId++;
        currentPhase = Phase.Registration;
        emit NewElectionStarted(currentElectionId, block.timestamp);
    }

    // ---------------------------------------------------------------
    // Voting
    // ---------------------------------------------------------------

    function castVote(uint256 _candidateId)
        external
        whenNotPaused
        inPhase(Phase.Voting)
    {
        require(block.timestamp <= votingEnd[currentElectionId], "Voting period has ended");
        require(registeredVoters[msg.sender], "You are not a registered voter");
        require(!hasVotedInElection[currentElectionId][msg.sender], "You have already voted in this election");
        require(_candidateId > 0 && _candidateId <= candidatesCount[currentElectionId], "Invalid candidate");
        require(candidates[currentElectionId][_candidateId].isActive, "This candidate is not active");

        hasVotedInElection[currentElectionId][msg.sender] = true;
        votedCandidateInElection[currentElectionId][msg.sender] = _candidateId;
        candidates[currentElectionId][_candidateId].voteCount++;
        totalVotesCast[currentElectionId]++;

        emit VoteCast(currentElectionId, msg.sender, _candidateId, block.timestamp);
    }

    // ---------------------------------------------------------------
    // View / results functions — current election
    // ---------------------------------------------------------------

    function getCandidate(uint256 _candidateId)
        external
        view
        returns (uint256 id, string memory name, string memory party, uint256 voteCount, bool isActive)
    {
        require(_candidateId > 0 && _candidateId <= candidatesCount[currentElectionId], "Invalid candidate");
        Candidate memory c = candidates[currentElectionId][_candidateId];
        return (c.id, c.name, c.party, c.voteCount, c.isActive);
    }

    function getAllCandidates() external view returns (Candidate[] memory) {
        uint256 count = candidatesCount[currentElectionId];
        Candidate[] memory result = new Candidate[](count);
        for (uint256 i = 1; i <= count; i++) {
            result[i - 1] = candidates[currentElectionId][i];
        }
        return result;
    }

    function getVoterStatus(address _voter)
        external
        view
        returns (bool isRegistered, bool hasVoted, uint256 votedCandidateId)
    {
        return (
            registeredVoters[_voter],
            hasVotedInElection[currentElectionId][_voter],
            votedCandidateInElection[currentElectionId][_voter]
        );
    }

    function getWinner()
        external
        view
        inPhase(Phase.Ended)
        returns (uint256 winnerId, string memory name, uint256 voteCount)
    {
        return _computeWinner(currentElectionId);
    }

    function getTimeRemaining() external view returns (uint256) {
        if (currentPhase != Phase.Voting || block.timestamp >= votingEnd[currentElectionId]) {
            return 0;
        }
        return votingEnd[currentElectionId] - block.timestamp;
    }

    function isAdmin(address _addr) external view returns (bool) {
        return admins[_addr];
    }

    // ---------------------------------------------------------------
    // View / results functions — historical elections
    // ---------------------------------------------------------------

    function getCandidatesForElection(uint256 _electionId) external view returns (Candidate[] memory) {
        require(_electionId > 0 && _electionId <= currentElectionId, "Invalid election ID");
        uint256 count = candidatesCount[_electionId];
        Candidate[] memory result = new Candidate[](count);
        for (uint256 i = 1; i <= count; i++) {
            result[i - 1] = candidates[_electionId][i];
        }
        return result;
    }

    function getElectionWinner(uint256 _electionId)
        external
        view
        returns (uint256 winnerId, string memory name, uint256 voteCount)
    {
        require(_electionId > 0 && _electionId <= currentElectionId, "Invalid election ID");
        require(
            _electionId < currentElectionId || currentPhase == Phase.Ended,
            "That election has not ended yet"
        );
        return _computeWinner(_electionId);
    }

    function _computeWinner(uint256 _electionId)
        internal
        view
        returns (uint256 winnerId, string memory name, uint256 voteCount)
    {
        uint256 count = candidatesCount[_electionId];
        require(count > 0, "No candidates in this election");

        uint256 winningId = 1;
        uint256 highestVotes = candidates[_electionId][1].voteCount;

        for (uint256 i = 2; i <= count; i++) {
            if (candidates[_electionId][i].voteCount > highestVotes) {
                highestVotes = candidates[_electionId][i].voteCount;
                winningId = i;
            }
        }
        return (winningId, candidates[_electionId][winningId].name, highestVotes);
    }
}
