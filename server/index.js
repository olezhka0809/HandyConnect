const express = require('express');
const cors    = require('cors');
require('dotenv').config();

const aiRoutes = require('./routes/ai');

const app  = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'HandyConnect API is running' });
});

app.use('/api/ai', aiRoutes);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});