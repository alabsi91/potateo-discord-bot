import { writeFile } from 'fs/promises';
import { stdin as input, stdout as output } from 'node:process';
import path from 'path';
import readline from 'readline/promises';

async function askName() {
  const rl = readline.createInterface({ input, output });

  return await rl.question('Enter command name: ');
}

const commandName = await askName();

if (!commandName) {
  console.log('No command name provided');
  process.exit(1);
}

const commandPath = path.join('src', 'commands', `${commandName}.ts`);
const template = `import { PermissionFlagsBits } from 'discord.js';

import type { Command } from '../types.js';

const command: Command = {
  name: '${commandName}',
  async execute(message) {},
  cooldown: 10,
  aliases: [],
  permissions: [PermissionFlagsBits.Administrator],
};

export default command;
`;

await writeFile(commandPath, template);

console.log(`Created ${commandPath}`);

process.exit(0);
