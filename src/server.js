require('dotenv').config();

const app = require('./app');
const { initDatabase } = require('./db/database');

const PORT = Number(process.env.PORT) || 3000;

initDatabase();

app.listen(PORT, () => {
  console.log(`PharmaPuglia OpenCare attivo su http://localhost:${PORT}`);
});
