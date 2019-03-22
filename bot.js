const { Client } = require('discord.js');
const yt = require('ytdl-core');
const tokens = require('./tokens.json');
const client = new Client();

let queue = {11};

const commands = {
	'play': (msg) => {
		if (queue[msg.guild.id] === undefined) return msg.channel.sendMessage(' `اضف بعض من الصوتيات اولا بعد علامة البوت المخصصة` ');
		if (!msg.guild.voiceConnection) return commands.join(msg).then(() => commands.play(msg));
		if (queue[msg.guild.id].playing) return msg.channel.sendMessage(' `تعمل حاليا ` ');
		let dispatcher;
		queue[msg.guild.id].playing = true;

		console.log(queue);
		(function play(song) {
			console.log(song);
			if (song === undefined) return msg.channel.sendMessage(' `قائمة الانتظار خالية ` ').then(() => {
				queue[msg.guild.id].playing = false;
				msg.member.voiceChannel.leave();
			});
			msg.channel.sendMessage(` Playing: **${song.title}** as requested by: **${song.requester}** `);
			dispatcher = msg.guild.voiceConnection.playStream(yt(song.url, { audioonly: true }), { passes : tokens.passes });
			let collector = msg.channel.createCollector(m => m);
			collector.on('message', m => {
				if (m.content.startsWith(tokens.prefix + 'pause')) {
					msg.channel.sendMessage(' `ايقاف `').then(() => {dispatcher.pause();});
				} else if (m.content.startsWith(tokens.prefix + 'resume')){
					msg.channel.sendMessage(' `اعادة تشغيل ` ').then(() => {dispatcher.resume();});
				} else if (m.content.startsWith(tokens.prefix + 'skip')){
					msg.channel.sendMessage(' `تم التخطي ` ').then(() => {dispatcher.end();});
				} else if (m.content.startsWith('volume+')){
					if (Math.round(dispatcher.volume*50) >= 100) return msg.channel.sendMessage(`Volume: ${Math.round(dispatcher.volume*50)}%`);
					dispatcher.setVolume(Math.min((dispatcher.volume*50 + (2*(m.content.split('+').length-1)))/50,2));
					msg.channel.sendMessage(`Volume: ${Math.round(dispatcher.volume*50)}%`);
				// eslint-disable-next-line no-empty
				} else if (m.content.startsWith('volume-')){
				} else if (m.content.startsWith('leave')){
					msg.channel.sendMessage(' `تم ايقاف البوت` ').then(() => {dispatcher.leave();});
					if (Math.round(dispatcher.volume*50) <= 0) return msg.channel.sendMessage(`Volume: ${Math.round(dispatcher.volume*50)}%`);
					dispatcher.setVolume(Math.max((dispatcher.volume*50 - (2*(m.content.split('-').length-1)))/50,0));
					msg.channel.sendMessage(`Volume: ${Math.round(dispatcher.volume*50)}%`);
				} else if (m.content.startsWith(tokens.prefix + 'time')){
					msg.channel.sendMessage(`time: ${Math.floor(dispatcher.time / 60000)}:${Math.floor((dispatcher.time % 60000)/1000) <10 ? '0'+Math.floor((dispatcher.time % 60000)/1000) : Math.floor((dispatcher.time % 60000)/1000)}`);
				}
				
			});
			dispatcher.on('end', () => {
				collector.stop();
				play(queue[msg.guild.id].songs.shift());
			});
			dispatcher.on('error', (err) => {
				return msg.channel.sendMessage('error: ' + err).then(() => {
					collector.stop();
					play(queue[msg.guild.id].songs.shift());
				});
			});
		})(queue[msg.guild.id].songs.shift());
	},
	'join': (msg) => {
		return new Promise((resolve, reject) => {
			const voiceChannel = msg.member.voiceChannel;
			if (!voiceChannel || voiceChannel.type !== 'voice') return msg.reply(' `لا استطيع الدخول الى القناة الصوتية المتواجد بها `');
			voiceChannel.join().then(connection => resolve(connection)).catch(err => reject(err));
		});
	},
	'add': (msg) => {
		let url = msg.content.split(' ')[1];
		if (url == '' || url === undefined) return msg.channel.sendMessage(' ` لابد اولا ان تضع رابط الفيديو او الصوت من اليوتيوب ` ');
		yt.getInfo(url, (err, info) => {
			if(err) return msg.channel.sendMessage(' `رابط غير صحيح: ` ' + err);
			if (!queue.hasOwnProperty(msg.guild.id)) queue[msg.guild.id] = {}, queue[msg.guild.id].playing = false, queue[msg.guild.id].songs = [];
			queue[msg.guild.id].songs.push({url: url, title: info.title, requester: msg.author.username});
			msg.channel.sendMessage(`added **${info.title}** to the queue`);
		});
	},
	'queue': (msg) => {
		if (queue[msg.guild.id] === undefined) return msg.channel.sendMessage(' ` اضف بعض الصوتيات الى قائمة الانتظار اولا `');
		let tosend = [];
		queue[msg.guild.id].songs.forEach((song, i) => { tosend.push(`${i+1}. ${song.title} - Requested by: ${song.requester}`);});
		msg.channel.sendMessage(`__**${msg.guild.name}'s Music Queue:**__ Currently **${tosend.length}** songs queued ${(tosend.length > 15 ? '*[Only next 15 shown]*' : '')}\n\`\`\`${tosend.slice(0,15).join('\n')}\`\`\``);
	},
	'help': (msg) => {
		let tosend = ['```xl', '#music :  لمعرفة طريقة استخدام البوت الخاص بالميوزك', 'join : "ادخال البوت الى روم صوتي"',	tokens.prefix + 'add : "اضف رابط صالح من اليوتيوب الى قائمة الانتظار"', tokens.prefix + 'queue : "رؤية الصوتيات الموجودة في قائمة الانتظار"', tokens.prefix + 'play : "تشغيل الرابط الصوتي بعد الدخول الى روم صوتي "', '', 'اذا اردت المزيد من المساعدة لاتتردد في التواصل مع الادارة'.toUpperCase(), tokens.prefix + 'pause : "ايقاف مؤقت لـ البوت"',	tokens.prefix + 'resume : "اعادة تشغيل بعد الايقاف المؤقت"', tokens.prefix + 'skip : "تخطي المقطع الصوتي اللذي يعمل"', tokens.prefix + 'time : "رؤية المدة الزمنية لـ المقطع الموجود بقائمة الانتظار"',	'volume+(+++) : "زيادة مستوى الصوت"',	'volume-(---) : "اخفاض مستوى الصوت"','GELLORY#9633 : "تمت برمجة البوت بواسطة"',	'```'];
		msg.author.sendMessage(tosend.join('\n'));
	},
};

client.on('ready', () => {
	console.log('ready!');


});

client.on('message', msg => {
	if (!msg.content.startsWith(tokens.prefix)) return;
	if (commands.hasOwnProperty(msg.content.toLowerCase().slice(tokens.prefix.length).split(' ')[0])) commands[msg.content.toLowerCase().slice(tokens.prefix.length).split(' ')[0]](msg);
});
client.login(tokens.d_token);
