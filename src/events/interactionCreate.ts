import { Events } from 'discord.js';

import { Log } from '../logger.js';

import type { BotEvent } from '../types.js';

const event: BotEvent<Events.InteractionCreate> = {
  name: Events.InteractionCreate,

  execute: interaction => {
    // the user has used a slash command by typing not by using autocomplete
    if (interaction.isChatInputCommand()) {
      const command = interaction.client.slashCommands.get(interaction.commandName); // get the slash command
      if (!command) return; // slash command not found

      // check if slash command has a cooldown
      const cooldown = interaction.client.cooldowns.get(`${interaction.commandName}-${interaction.user.username}`);
      if (command.cooldown) {
        // user has cooldown entry
        if (cooldown) {
          // check if cooldown timer is over
          if (Date.now() < cooldown) {
            interaction.reply(
              `You have to wait ${Math.floor(Math.abs(Date.now() - cooldown) / 1000)} second(s) to use this command again.`,
            );
            setTimeout(() => interaction.deleteReply(), 5000);
            return;
          }

          // renew cooldown
          interaction.client.cooldowns.set(
            `${interaction.commandName}-${interaction.user.username}`,
            Date.now() + command.cooldown * 1000,
          );

          // delete entry after cooldown is over
          setTimeout(() => {
            interaction.client.cooldowns.delete(`${interaction.commandName}-${interaction.user.username}`);
          }, command.cooldown * 1000);

          // set new cooldown entry
        } else {
          interaction.client.cooldowns.set(
            `${interaction.commandName}-${interaction.user.username}`,
            Date.now() + command.cooldown * 1000,
          );
        }
      }

      // execute slash command
      command.execute(interaction);
      return;
    }

    // the user has used an autocomplete
    if (interaction.isAutocomplete()) {
      const command = interaction.client.slashCommands.get(interaction.commandName); // get the slash command
      if (!command) {
        Log.error(`No command matching ${interaction.commandName} was found.`);
        return;
      }

      try {
        if (!command.autocomplete) return; // using autocomplete is not enabled for this command

        // execute autocomplete
        command.autocomplete(interaction);
      } catch (error) {
        Log.error('There was an error while trying to execute an autocomplete command!');
      }
    }
  },
};

export default event;
