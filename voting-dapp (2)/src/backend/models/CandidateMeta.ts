import mongoose from 'mongoose';

const CandidateMetaSchema = new mongoose.Schema({
  candidateId: { type: Number, required: true, unique: true },
  bio: { type: String, default: '' },
  photoUrl: { type: String, default: '' },
  manifesto: { type: String, default: '' }
}, { timestamps: true });

export const CandidateMeta = mongoose.model('CandidateMeta', CandidateMetaSchema);
