var current_player = 0;
var global_audio_volume = 0.5;
var playlists = new Object();


function isDesktop() {
	return !navigator.userAgent.match(/(iPad)|(iPhone)|(iPod)|(android)|(webOS)/i);
};


function loadSVG(name) {
	var request = new XMLHttpRequest();
	request.open('GET', `music_player/${name}.svg`);
	request.send(null);
	request.onreadystatechange = function() {
		if(request.readyState === 4 && request.status === 200) {
			var oldElement = document.getElementById(`svg-${name}`);
			var newElement = document.createElement('template');
			newElement.innerHTML = request.responseText.trim();

			oldElement.parentNode.replaceChild(newElement.content.firstChild, oldElement);
		}
	}
	return `<template id="svg-${name}"></template>`
};

function bindSliderFunc(box, slider, isOnMouseRelease, action, condition){
	slider.isMouseDown = false;

	function getPercent(e) { 
		var hitbox = slider.getBoundingClientRect();
		var percent = (e.x - hitbox.x) / hitbox.width;
		return Math.min(Math.max(percent, 0), 1);
	}

	box.onmousedown = (e) => {
		if(!condition())
			return;

		if(e.preventDefault) e.preventDefault();
		var percent = getPercent(e);
		if(!isOnMouseRelease)
			action(percent);
		slider.style.setProperty("--progress", percent * 100 + "%");

		slider.classList.add("changing");
		slider.isMouseDown = true;
	}
	document.addEventListener("mouseup", (event) => {
		if(slider.isMouseDown && isOnMouseRelease)
			action(getPercent(event));
		
		slider.classList.remove("changing");
		slider.isMouseDown = false;
	});
	document.addEventListener("mousemove", (e) => {
		if(slider.isMouseDown){
			if(e.preventDefault) e.preventDefault();
			var percent = getPercent(e);
			
			if(!isOnMouseRelease)
				action(percent);
			slider.style.setProperty("--progress", percent * 100 + "%"); 
		}
	});
}


class MusicPlayer extends HTMLElement {

	connectedCallback() {
		let src = this.getAttribute('src');
		let title = this.getAttribute('name');
		let image = this.hasAttribute('image') ? this.getAttribute('image') : src.replace('.mp3', '.jpg');
		let singer = this.getAttribute('singer');
		
		var playlistName = this.hasAttribute('playlist') ? this.getAttribute('playlist') : "__empty";
		if(!playlists[playlistName])
			playlists[playlistName] = [];
		var playlist = playlists[playlistName];
		var playlistIndex = playlist.length;
		playlist.push(this);

		this.innerHTML = `
			<div id="player_image_container" class="noselect">
				<img id="player_image" src="${image}" class="noselect" onerror="this.onerror=null;this.src='music_player/empty.png';"/>
				<div id="player_image_darkfilter"></div>
				<div id="player_icon_play" class="player_icon noselect">
					${loadSVG("play")}
				</div>
				<div id="player_icon_pause" class="player_icon noselect">
					${loadSVG("pause")}
				</div>
				<div id="player_icon_playing" class="player_icon noselect">
					${loadSVG("waves")}
				</div>
			</div>
			<div id="player_body">
				<div id="player_head">
					<div id="player_titles">
						<div id="player_title">${title}</div>
						<div id="player_singer">${singer}</div>
					</div>
					<div id="player_volume" class="noselect" ${isDesktop()? ``: `style="opacity: 0"`}>
						<div id="player_volume_bar_container">
							<div id="player_volume_bar" class="player_slider"></div>
						</div>
						<div id="player_volume_icon">
							${loadSVG("sound")}
						</div>
					</div>
				</div>
				<div id="player_bottom">
					<div id="player_progress_bar_container">
						<div id="player_progress_bar" class="player_slider"></div>
					</div>
					<div id="player_progress_duration" class="noselect">0:00</div>
				</div>
			</div>
		`;
		
		var isPlaying = false;
		var player = this;

		const duration = this.querySelector("#player_progress_duration");
		const progress_bar = this.querySelector("#player_progress_bar");
		const volume_bar = this.querySelector("#player_volume_bar");

		var audio = new Audio(src);
		this.audio = audio;
		audio.preload = 'metadata';
		audio.onloadeddata = updateTimerLabel;
		audio.onloadedmetadata = updateTimerLabel;
		audio.ontimeupdate = (event) => {
			var percent = audio.currentTime / audio.duration;
			if(!progress_bar.classList.contains("changing"))
				progress_bar.style.setProperty("--progress", percent * 100 + "%")
			updateTimerLabel();
		}
		audio.onplaying = () => {
			if(current_player.audio != audio){
				if(current_player.audio){
					current_player.audio.pause();
					current_player.audio.currentTime = 0;
					current_player.classList.remove("player_selected");
				}
				current_player = player;
				current_player.classList.add("player_selected");
			}
			isPlaying = true;
			
			audio.volume = global_audio_volume;
			volume_bar.style.setProperty("--progress", global_audio_volume * 100 + "%");

	  		player.classList.add("player_playing");
			player.classList.remove("player_paused");
			updateTimerLabel();
		};
		audio.onpause = () => {
	  		isPlaying = false;
	  		player.classList.remove("player_playing");
			player.classList.add("player_paused");
			updateTimerLabel();
			
			if(audio.currentTime == audio.duration){
				setProgress(0);
				nextSong();
			}
		};
		audio.src = src;

		
		player.classList.add(isDesktop() ? "desktop": "mobile");
		player.classList.add("player_paused");

		bindSliderFunc(this.querySelector("#player_volume_bar_container"), volume_bar, false, setVolume,
			() => player.classList.contains("player_selected")
		);
		bindSliderFunc(this.querySelector("#player_progress_bar_container"), progress_bar, true, setProgress,
			() => player.classList.contains("player_selected")
		);

		bindControlFunctionality(this.querySelector("#player_image_container"));
		bindControlFunctionality(this.querySelector("#player_titles"));
		

		// Functions
		function setVolume(percent){
			global_audio_volume = percent;
			audio.volume = percent;
		}

		function setProgress(percent){
			if(audio.duration)
				audio.currentTime = Math.floor(audio.duration * percent);
		}

		function updateTimerLabel(){
			if(!audio.duration)
				return;
			var time = isPlaying ? audio.currentTime : audio.duration;
			var minutes = parseInt(time / 60);
			var seconds = parseInt(time % 60);
			duration.innerHTML = `${minutes}:${seconds < 10 ? ('0'+seconds) : seconds}`;
		}

		function bindControlFunctionality(element){
			element.style.cursor = "pointer";
			element.addEventListener("mouseenter", () => {
				player.classList.add("player_hover");
			});
			element.addEventListener("mouseleave", () => {
				player.classList.remove("player_hover");
			});
			element.addEventListener("click", () => {
				if(isPlaying) audio.pause();
				else audio.play();
			});
		}
		function bindVolumeControlFunctionality(element){
			//element.style.cursor = "pointer";
			element.addEventListener("click", () => {
				
			});
		}

		function nextSong(){
			if(playlistName != "__empty" && playlistIndex < playlist.length - 1)
				playlist[playlistIndex + 1].audio.play();
			
		}
	}

	disconnectedCallback() {
		this.audio.pause();
	}
}

window.customElements.define('music-player', MusicPlayer);