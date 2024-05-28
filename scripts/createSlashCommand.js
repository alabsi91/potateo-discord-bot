import { writeFile } from 'fs/promises';
import { stdin as input, stdout as output } from 'node:process';
import path from 'path';
import readline from 'readline/promises';

async function askName() {
  const rl = readline.createInterface({ input, output });

  return await rl.question('Enter slash command name: ');
}

const commandName = await askName();

if (!commandName) {
  console.log('No command name provided');
  process.exit(1);
}

const commandPath = path.join('src', 'slashCommands', `${commandName}.ts`);
const template = `import { SlashCommandBuilder } from 'discord.js';

import type { SlashCommand } from '../types.js';

const command: SlashCommand = {
  command: new SlashCommandBuilder().setName('${commandName}').setDescription("${commandName} description"),

  async execute(interaction) {},

  cooldown: 10,
};

export default command;
`;

await writeFile(commandPath, template);

console.log(`Created ${commandPath}`);

process.exit(0);
