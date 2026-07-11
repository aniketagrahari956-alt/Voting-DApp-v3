const fs = require('fs');
let code = fs.readFileSync('src/backend/routes/api.ts', 'utf8');

const oldGet = `apiRouter.get('/candidates', async (req, res) => {
  try {
    const contract = getContract();
    let onChainCandidates = [];
    if (contract) {
      onChainCandidates = await contract.getAllCandidates();
    }`;

const newGet = `apiRouter.get('/candidates', async (req, res) => {
  try {
    const contract = getContract();
    let onChainCandidates = [];
    if (contract) {
      try {
        onChainCandidates = await contract.getAllCandidates();
      } catch (e) {
        console.warn("Failed to get candidates from contract, skipping", e.message);
      }
    }
    
    const dbCandidates = await Candidate.find({});`;

code = code.replace(oldGet, newGet);

const oldMerge = `const merged = onChainCandidates.map((c: any) => ({
      id: Number(c.id),
      name: c.name,
      party: c.party,
      voteCount: Number(c.voteCount),
      isActive: c.isActive,
      bio: metaMap[Number(c.id)]?.bio || '',
      photoUrl: metaMap[Number(c.id)]?.photoUrl || '',
      manifesto: metaMap[Number(c.id)]?.manifesto || ''
    }));`;

const newMerge = `const mergedMap = new Map();
    
    // Add on-chain
    onChainCandidates.forEach((c: any) => {
      const id = Number(c.id);
      mergedMap.set(id, {
        id,
        name: c.name,
        party: c.party,
        voteCount: Number(c.voteCount),
        isActive: c.isActive
      });
    });

    // Add db
    dbCandidates.forEach((c: any) => {
      const id = Number(c.id);
      if (!mergedMap.has(id)) {
        mergedMap.set(id, {
          id,
          name: c.name,
          party: c.party,
          voteCount: Number(c.voteCount),
          isActive: c.isActive
        });
      }
    });

    const merged = Array.from(mergedMap.values()).map(c => ({
      ...c,
      bio: metaMap[c.id]?.bio || '',
      photoUrl: metaMap[c.id]?.photoUrl || '',
      manifesto: metaMap[c.id]?.manifesto || ''
    }));`;

code = code.replace(oldMerge, newMerge);

fs.writeFileSync('src/backend/routes/api.ts', code);
