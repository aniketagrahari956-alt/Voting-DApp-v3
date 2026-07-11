import mongoose from 'mongoose';

const VoterRequestSchema = new mongoose.Schema({
  walletAddress: { type: String, required: true, lowercase: true, index: true },
  fullName: { type: String, required: true },
  identityProofBase64: { type: String, required: true },
  identityProofMimeType: { type: String, required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  submittedAt: { type: Date, default: Date.now },
  reviewedAt: { type: Date, default: null },
  reviewedBy: { type: String, default: null }
});

export const VoterRequest = mongoose.model('VoterRequest', VoterRequestSchema);
