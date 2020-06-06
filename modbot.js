const fs = require('fs');
const Discord = require('discord.js');
let token;
if (process.env.BOT_TOKEN) {
	token = process.env.BOT_TOKEN;
}
else {
	token = require('./config.json').token;
}
const client = new Discord.Client();

const words = fs.readFileSync('words.txt', 'utf8').split('\n');
const waitTime = 60000;
let currentwords = {};
let mutedRole = {};
let activity = {};
let prefix = {};

client.once('ready', () => {
	console.log('Ready!');
	client.user.setPresence({ activity: { name: `!help` }, status: 'online' });
});

function handleCommand(message) {
	let channelId = message.channel.id;
	let guildId = message.guild.id;
	let pfx = prefix[guildId] || '!';
	const args = message.content.slice(pfx.length).split(/ +/);
	const command = args.shift().toLowerCase();

	if (command === 'startgame') {
		message.guild.roles.fetch().then(roles => {
			mutedRole[channelId] = roles.cache.find(r => r.name === 'Muted');
			words.sort(() => Math.random()*2-1);
			currentwords[channelId] = words.slice(0, 5);
			message.channel.send('The game has started.');
		});
	}
	else if (command === 'endgame') {
		currentwords[channelId] = undefined;
		resetRoles(message);
		return message.channel.send('The game has ended.');
	}
	else if (command === 'guess') {
		handleGuess(args[0], message);
  }
	else if (command === 'words') {
		return message.channel.send(`${currentwords[channelId]}`);
	}
	else if (command === 'createmuterole') {
		message.guild.roles.create({ data: { name: 'Muted' } });
		return message.channel.send('Role created! Please change the permissions of this role by denying \'Send Messages\' in the channel this bot will be in.');
	}
	else if (command === 'invite') {
		message.member.send('The invite link is https://discord.com/api/oauth2/authorize?client_id=717549273201508423&permissions=268443648&scope=bot');
		return message.channel.send('You have been DM\'d the invite link.');
	}
	else if (command === 'prefix') {
		if (!args.length) {
			delete prefix[guildId];
		}
		else {
			prefix[guildId] = args[0];
		}
		return message.channel.send(`The prefix has been set to '${prefix[guildId] || '!'}'.`)
	}
	else if (command === 'help') {
		message.reply('you have been DM\'d the help menu.')
		return message.member.send(`__**The commands are:**__\n\`Help\`---*DM's you this page!*\n\`Startgame\`---*starts the game.*\n\`Endgame\`---*ends the current game.*\n\`Guess <word>\`---*guesses one of the flagged words during a game.*\n\`Createmuterole\`---*creates a muted role for the game.*\n\`Invite\`---*DM's you the invite link.*\nThe prefix is: ${prefix[guildId] || '!'}\n\nIf you haven\'t already, use the \'Createmuterole\' command, then deny the \'Send Messages\' permission for the \'Muted\' role in the channel with the bot.`)
	}
}

function parseMessage(message) {
	let channelId = message.channel.id;
	if (!currentwords[channelId]) return;
	for(let word of currentwords[channelId]) {
		let pattern = new RegExp(`\\b${word}\\b`, 'i');
		if (message.content.match(pattern)) {
			message.member.roles.add(mutedRole[channelId]);
			message.delete();
			return message.reply('said the word!');
		}
	}
}

function resetRoles(message) {
	let channelId = message.channel.id;
	message.guild.members.fetch().then(members => {
		for(let member of members.array()) {
			member.roles.remove(mutedRole[channelId]);
		}
	});
}

function handleGuess(guess, message) {
	let memberId = message.member.id;
	let channelId = message.channel.id;
	let now = Date.now();
	if (!currentwords[channelId]) {
		return message.channel.send('The game hasn\'t started yet.');
	}

	if (!guess) {
		return message.channel.send('You need to guess a word.');
	}



	if (activity[memberId] && activity[memberId][channelId] >= now-waitTime) {
		return message.reply('You can\'t guess again so soon.');
	}
	if (!activity[memberId]) activity[memberId] = {};
	activity[memberId][channelId] = now;

	for(let i = 0; i < currentwords[channelId].length; i++) {
		let word = currentwords[channelId][i];
		if (guess.toLowerCase() === word) {
			currentwords[channelId].splice(i, 1);
			message.reply('That is a correct word!');
			if (currentwords[channelId].length === 0) {
				currentwords[channelId] = undefined;
				resetRoles(message);
				message.channel.send('```The game is over!```');
			}
			return;
		}
	}

	return message.reply('That is a wrong word!');
}

client.on('message', message => {
	if (message.author.bot) return;

	if (message.content.startsWith(prefix[message.guild.id] || '!')) {
		handleCommand(message);
	} else {
		parseMessage(message);
	}

});

client.login(token);
