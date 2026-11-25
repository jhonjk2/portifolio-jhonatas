const readline = require('node:readline');
const bcrypt = require('bcryptjs');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
rl.question('Define a palavra-passe de administrador (não a partilhes): ', async (password) => {
  if (password.length < 12) {
    console.error('A palavra-passe deve ter pelo menos 12 caracteres.');
    rl.close();
    process.exitCode = 1;
    return;
  }
  console.log('\nCopia este hash para ADMIN_PASSWORD_HASH nas variáveis de ambiente da Render:\n');
  console.log(await bcrypt.hash(password, 12));
  rl.close();
});
