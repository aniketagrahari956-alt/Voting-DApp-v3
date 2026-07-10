import mongoose from 'mongoose';

const VoterSchema = new mongoose.Schema({
  address: { type: String, required: true, unique: true },
  isRegistered: { type: Boolean, default: false },
  hasVoted: { type: Boolean, default: false },
  votedCandidateId: { type: Number, default: 0 },
}, { timestamps: true });

export const Voter = mongoose.model('Voter', VoterSchema);
