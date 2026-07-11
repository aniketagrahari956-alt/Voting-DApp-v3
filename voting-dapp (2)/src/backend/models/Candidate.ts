import mongoose from 'mongoose';

const CandidateSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  name: { type: String, required: true },
  party: { type: String, required: true },
  voteCount: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

export const Candidate = mongoose.model('Candidate', CandidateSchema);
