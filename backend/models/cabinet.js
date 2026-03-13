// SCRUM-70: Firestore cabinet-item schema definition
const cabinetSchema = {
  name: { type: "string", required: true },
  category: { type: "string", enum: ["spirit", "mixer", "garnish", "other"], required: true },
  quantity: { type: "number", required: false },
  unit: { type: "string", required: false },
  dateAdded: { type: "timestamp", required: true },
};

module.exports = cabinetSchema;
