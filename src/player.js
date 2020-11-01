class PxWebPlayer {
  constructor (playerWrapEl, stopPlayEl) {
    this.canvas = null
    this._play = false
    this._paused = false
    this._mute = true

    this.drawFunc = null
    this.onResize = null
    this.onPause = null
    this.onResume = null
    this.onSoundToggleFunc = null

    this.throttle = 0

    this.playerWrapEl = playerWrapEl || document.body
    this.continueButton = null
    this.fullcreenButton = null
    this.soundButton = null
    this.continueButtonText = 'Click to continue'

    const urlParams = new URLSearchParams(window.location.search);
    const noFullscreen = urlParams.get('nfs');

    this.setupStyles()
    if (!noFullscreen) {
      this.setupFullscreenButton()
    }

    if (stopPlayEl instanceof HTMLElement) {
      stopPlayEl.addEventListener('click', () => {
        this.togglePlay()
      })
    }

    window.addEventListener('resize', () => {
      this.updateCanvasResolution()
      if (typeof this.onResize === 'function') this.onResize()
      if (!this._play) this.draw() // update still image
    })
    window.addEventListener('keyup', e => {
      if (e.code === 'Space' || e.keyCode === 32) this.togglePlay()
    })
    // window.addEventListener('blur', () => {
    //   this._play = false
    // })
    // window.addEventListener('focus', () => {
    //   if (this._paused || this._play) return
    //   this._play = true
    //   this.draw()
    // })
  }

  /**
   * @param {function} func
   */
  set onSoundToggle (func) {
    if (typeof func === 'function') {
      this.onSoundToggleFunc = func
      this.setupSoundButton()
    }
  }

  draw() {
    if (typeof this.drawFunc === 'function') {
      this.drawFunc()
    }
    if (!this._play) return
    if (this.throttle) {
      setTimeout(() => {
        requestAnimationFrame(() => { this.draw() })
      }, this.throttle)
    } else {
      requestAnimationFrame(() => { this.draw() })
    }
  }

  isPlaying () { return this._play }

  togglePlay () {
    this.play(!this._play)
  }

  toggleSound () {
    this._mute = !this._mute
    if (typeof this.onSoundToggleFunc === 'function') this.onSoundToggleFunc(!this._mute)
    if(!this._mute) {
      this.soundButton.classList.add('off')
    } else {
      this.soundButton.classList.remove('off')
    }
  }

  play (play) {
    if (typeof play === 'undefined') play = true
    this._play = play
    this._paused = !this._play
    if (!this._play && typeof this.onPause === 'function') this.onPause()
    if (this._play && typeof this.onResume === 'function') this.onResume()
    if(this._play) {
      if (this.continueButton) {
        this.continueButton.style.opacity = '0'
        this.continueButton.style.cursor = null
      }
      this.draw()
    } else {
      const button = this.getContinueButton()
      button.style.opacity = '1'
      button.style.cursor = 'pointer'
    }
  }

  toggleFullscreen () {
    if (document.fullscreenElement) {
      document.exitFullscreen();
      this.fullcreenButton.classList.remove('on')
    } else {
      if (this.playerWrapEl.requestFullscreen) {
        this.playerWrapEl.requestFullscreen()
        this.fullcreenButton.classList.add('on')
      }
    }
  }

  makeInfoPanel () {}
  getContinueButton () {
    if (!(this.continueButton instanceof HTMLElement)) {
      const div = document.createElement('div')
      div.textContent = this.continueButtonText
      div.classList.add('px-player-button')
      div.classList.add('px-player-continue-button')
      this.playerWrapEl.appendChild(div)
      this.continueButton = div
      this.continueButton.addEventListener('click', () => { this.togglePlay() })
    }
    return this.continueButton
  }

  setupSoundButton () {
    const svgSound = `<svg xmlns="http://www.w3.org/2000/svg" version="1.0"  width="500" height="500" viewBox="0 0 75 75">
<path class="fill" d="M39.389,13.769 L22.235,28.606 L6,28.606 L6,47.699 L21.989,47.699 L39.389,62.75 L39.389,13.769z"/>
<path d="M48,27.6a19.5,19.5 0 0 1 0,21.4M55.1,20.5a30,30 0 0 1 0,35.6M61.6,14a38.8,38.8 0 0 1 0,48.6"/>
</svg>`
    const div = document.createElement('div')
    div.classList.add('px-sound-button')
    div.innerHTML = svgSound
    this.playerWrapEl.appendChild(div)
    div.addEventListener('click', () => { this.toggleSound() })
    this.soundButton = div
  }

  setupFullscreenButton () {
    const svgFullscreen = `<svg class="on" xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24"><path d="M0 0h24v24H0z" fill="none"/><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>`
    const svgFullscreenExit = `<svg class="off" xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24"><path d="M0 0h24v24H0z" fill="none"/><path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/></svg>`
    const div = document.createElement('div')
    div.classList.add('px-player-button')
    div.classList.add('px-player-fullscreen-button')
    div.innerHTML = svgFullscreen + svgFullscreenExit
    this.playerWrapEl.appendChild(div)
    div.addEventListener('click', () => { this.toggleFullscreen() })
    this.fullcreenButton = div
  }

  setupStyles () {
    const { position } = window.getComputedStyle(this.playerWrapEl)
    if (position === 'static') this.playerWrapEl.style.position = 'relative'
    this.addPlayerStyle()
  }

  addPlayerStyle () {
    const head = document.head || document.getElementsByTagName('head')[0]
    const styleTag = document.createElement('style')
    styleTag.type = 'text/css'
    styleTag.appendChild(document.createTextNode(
      `
      .px-player-button {
        font-family: Helvetica, sans-serif;
        position: absolute;
        bottom: 0;
        z-index: 10000;
        padding: 20px 40px;
        background: rgba(200,200,200,0.8);
        color: #fff;
        user-select: none;
        cursor: pointer;
      }
      .px-sound-button {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        z-index: 10000;
        width: 20vmin;
        height: 20vmin;
        max-width: 200px;
        max-height: 200px;
        user-select: none;
        cursor: pointer;
        transition: opacity 0.2s;
      }
      .px-sound-button svg {
        width: 100%;
        height: 100%;
        transform: translateX(-2.1%);
      }
      .px-sound-button svg path { 
        stroke: rgba(200,200,200,0.8); 
        stroke-width: 3;
        stroke-linejoin: round;
        fill: transparent; 
      }
      .px-sound-button svg path.fill {
        stroke: none;
        fill: rgba(200,200,200,0.8); 
      }
      .px-player-fullscreen-button{
        width: 48px;
        height: 48px;
        padding: 0;
        background: rgba(200,200,200,0.1);
        border-radius: 40%;
        right: 10px;
        bottom: 10px;
      }
      .px-player-fullscreen-button:active,
      .px-player-fullscreen-button:focus{
        background: rgba(200,200,200,0.8);
      }
      .px-player-fullscreen-button > * { 
        position: absolute; top: 50%; left: 50%;
        transform: translate(-50%, -50%);
        opacity: 0; transition: opacity 0.2s; 
      }
      .px-player-fullscreen-button > .off { opacity: 0 }
      .px-player-fullscreen-button > .on { opacity: 1 }
      .px-player-fullscreen-button.on > .off { opacity: 1 }
      .px-player-fullscreen-button.on > .on { opacity: 0 }
      .px-player-continue-button {
        left: 50%;
        transform: translateX(-50%);
        opacity: 0;
        transition: opacity 0.2s;
      }
      .off { opacity: 0; cursor: default; pointer-events: none; }`
      ))
    head.appendChild(styleTag)
  }

  createCanvas (id) {
    const canvas = document.createElement('canvas')
    if (id) canvas.id = id
    canvas.style.width = '100vw'
    canvas.style.height = '100vh'
    document.body.appendChild(canvas)
    this.canvas = canvas
    this.updateCanvasResolution()

    // if (!(this.stopPlayEl instanceof HTMLElement)) {
    this.canvas.addEventListener('click', () => {
      this.togglePlay()
    })
      // }
    return canvas

  }

  updateCanvasResolution (canvas) {
    canvas || (canvas = this.canvas)
    const res = window.devicePixelRatio
    canvas.width = window.innerWidth * res
    canvas.height = window.innerHeight * res
  }


  /**
   * @param {string} name
   * @param {string=} url
   * @return {string|null}
   */
  getParameterByName(name, url) {
    if (!url) url = window.location.href;
    name = name.replace(/[\[\]]/g, "\\$&");
    var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
      results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, " "));
  }
}
