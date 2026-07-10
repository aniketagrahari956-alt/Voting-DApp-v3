import mongoose from 'mongoose';

const AuditLogSchema = new mongoose.Schema({
  eventName: { type: String, required: true },
  txHash: { type: String, required: true }, // Removed unique constraint to support multi-event batches
  blockNumber: { type: Number, required: true },
  timestamp: { type: Date, required: true },
  data: { type: mongoose.Schema.Types.Mixed }
});

// Remove unique constraint on txHash, as one tx can emit multiple events (e.g. batch register)
AuditLogSchema.index({ txHash: 1, eventName: 1 });

export const AuditLog = mongoose.model('AuditLog', AuditLogSchema);
