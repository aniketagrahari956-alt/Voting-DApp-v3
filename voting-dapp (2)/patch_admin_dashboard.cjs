const fs = require('fs');
let code = fs.readFileSync('src/components/AdminDashboard.tsx', 'utf8');

const oldAdd = `  const handleAddCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contract) return;

    try {
      const tx = await contract.addCandidate(candidateName, candidateParty);
      await tx.wait();
      setCandidateName('');
      setCandidateParty('');
      alert("Candidate added!");
      fetchCandidates();
    } catch (err) {
      console.error(err);
      alert("Failed to add candidate");
    }
  };`;

const newAdd = `  const handleAddCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // First try to add via backend DB API if contract fails or doesn't exist
      const message = "I am an admin logging in at " + Date.now();
      const signature = signer ? await signer.signMessage(message) : '';
      
      let txSuccess = false;
      if (contract) {
        try {
          const tx = await contract.addCandidate(candidateName, candidateParty);
          await tx.wait();
          txSuccess = true;
        } catch (e) {
          console.warn("Contract addCandidate failed, falling back to API", e);
        }
      }
      
      if (!txSuccess) {
        const res = await fetch('/api/candidates', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-message': message,
            'x-admin-signature': signature
          },
          body: JSON.stringify({ name: candidateName, party: candidateParty })
        });
        if (!res.ok) throw new Error(await res.text());
      }
      
      setCandidateName('');
      setCandidateParty('');
      alert("Candidate added!");
      fetchCandidates();
    } catch (err) {
      console.error(err);
      alert("Failed to add candidate");
    }
  };`;

code = code.replace(oldAdd, newAdd);
fs.writeFileSync('src/components/AdminDashboard.tsx', code);
