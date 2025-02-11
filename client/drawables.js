// ------------------ DRAWABLE OBJECT CLASSES ------------------ 


class DrawablePoint {
    /**
     Represents a song "node" displayed on the map.
     */

    constructor(map, idx, id, info, imgPath, clipPath, color){
      this.map = map
      this.idx = idx
      this.id = id
      this.info = info
      this.imgPath = imgPath
      this.img = null
      this.clipPath = clipPath
      this.clip = null
      this.reader = null
      this.genre = null
      this.color = color

      // TODO: using globals here is a bit sketchy
      if (USE_GENRE_COLORS){
        this.genre = this.map.meta.info[this.id]["genre_class"]
        if (this.genre != null)
          this.color = GENRE_COLORS[this.genre]
      }
    }
  
    loadImgBlob(blob){
      // Load own image from given binary blob (data url)

      if (this.reader == null){
          this.reader = new FileReader()
          this.reader.onloadend = () => {
            var dataUrl = this.reader.result
            this.loadImg(dataUrl)
        }
      }
      this.reader.readAsDataURL(blob)
    }
  
    loadImg(imgPath){
      // Load own image from given or stored url/path

      if (!USE_IMG) return
      if (imgPath == null) imgPath = this.imgPath
      try{
        loadImage(imgPath, img => {
          this.img = img
        })
      }
      catch (e){}
    }
  
    unloadImg(){
      this.img = null
    }
  
    playClip(){
      // (OBSOLETE) Play 30s preview clip for this song

      if (playingClip && playingClip.isPlaying()){
        playingClip.stop()
      }
      soundFormats('mp3');
      loadSound(this.clipPath, sound => {
        if (sound)
          this.clip = sound
          playingClip = sound
          playingClip.play()
      })
    }
  
    draw(pos, circleSize){
      // Draw sphere or album cover for this song node (depending on setting)

      var r, g, b
      [r, g, b] = this.color
      fill(r, g, b)
  
      var size = IMG_SIZE
      if (this.img && USE_IMG){
        image(this.img, pos[0]-size/2, pos[1]-size/2, size, size)

        // if (this.map.selected == this.idx){
        //   var size = IMG_SIZE + IMG_SEL_PAD
        //   rect(pos[0]-size/2, pos[1]-size/2, size, size)
        // }
      
      }
      else{
        strokeWeight(0)
        ellipse(pos[0], pos[1], circleSize, circleSize)
        //text(this.idx, pos[0], pos[1])
        // if (this.map.selected == this.idx)
        //   ellipse(pos[0], pos[1], DOT_SEL_PAD, DOT_SEL_PAD)
      }
    }
  
  }
  
  class Walk {
    /**
      Represents a playlist, i.e. a sequence of songs on the map.
     */
  
    constructor(map, indices, showPath){
      this.map = map
      this.indices = indices
      this.i = 0
      this.playerEl = document.getElementById("embed-iframe")      // BODGE
      this.showPath = showPath
      this.isLoop = false

      //BODGE, this should definitely not be here
    }
  
    draw() {
      // Draw lines connecting the song sequence (called when walk is active)
      // TODO: handle color

      strokeWeight(WALK_STROKE)
      var c = this.map.colors[this.indices[0]]
      stroke(c[0], c[1], c[2])
      noFill()
      beginShape()
      var p0 = this.map.toScreen(this.map.proj[this.indices[0]])
      var p = p0

      // Draw connecting curve
      if (this.showPath){
        stroke(0, 0, 0, alpha)
        curveVertex(p[0], p[1])
        for(var i of this.indices){
            var pGlob = this.map.proj[i]
            p = this.map.toScreen(pGlob)
            curveVertex(p[0], p[1])
        }
        //curveVertex(p[0], p[1])
        if (this.isLoop){
          curveVertex(p0[0], p0[1])
          curveVertex(p0[0], p0[1])
        }
        endShape()
        }

      // Draw outlines around included songs
      for(var i in this.indices){
        let index = this.indices[i]
        var pGlob = this.map.proj[index]
        var p = this.map.toScreen(pGlob)
        var alpha = this.showPath ? 200 : 200 * ((this.indices.length-i) / (this.indices.length - this.i))
        stroke(0, 0, 0, alpha)
        //noFill()
        fill(255, 255, 255)
        if (USE_IMG){
          var size = IMG_SIZE + IMG_SEL_PAD
          rect(p[0]-size/2, p[1]-size/2, size, size)
        }
        else
          ellipse(p[0], p[1], DOT_SEL_PAD, DOT_SEL_PAD)
        noFill()
      }

    }

    moveTo(i){
      // Select i-th song in this walk on the map

      i = i % (this.indices.length)
      this.i = (i < 0) ? (this.indices.length - 1) + i : i
      this.map.selectPoint(this.indices[this.i])
      // var p = this.map.proj[this.indices[this.i]]
      // this.map.moveWindow(p, null)
      // this.map.drawables[this.indices[this.i]].playClip()
      return true     
    }

    moveToInd(songIndex){
      let i = this.whichSong(songIndex)
      this.moveTo(i)
    }
  
    next(){
      this.moveTo(this.i + 1)
      vueEventBus.$emit("walk-changed")
    }

    prev(){
      this.moveTo(this.i - 1)
      vueEventBus.$emit("walk-changed")
    }

    whichSong(songIndex){
      return this.indices.findIndex((el) => el == songIndex)
    }

    insertSong(songIndex, i){
      this.indices.splice(i, 0, songIndex)
      vueEventBus.$emit("walk-changed")
    }

    removeSong(i){
      this.indices.splice(i, 1)
      vueEventBus.$emit("walk-changed")
    }

    swapSongs(i, j){
      temp = this.indices[i]
      this.indices[i] = this.indices[j]
      this.indices[j] = temp
      vueEventBus.$emit("walk-changed")
    }
  
    static random(map, query, n, k){
      // Factory: build walk with random songs in k-neighborhood around query

      var q = query
      var walk = [q]
      for (var i = 0; i < n; i++){
        var pick = Math.trunc(Math.random() * k) + 1
        var next = map.findPoint(map.proj[q], pick)
        walk.push(next)
        q = next
      }
      walk = [...new Set(walk)]
      for(var i of walk) console.log(i)
  
      return new Walk(map, walk, false)
    }
  
    static giro(map, query, controls, dist){
      // Factory: build walk in a circle starting and ending at query

      var angle = Math.PI * 2 // !
      var ratio = width/height
      var q = query
      var origin = map.proj[q]

      if (dist == "auto")
        dist = map.windowW * 0.2
      
      if (controls == "auto"){
        let ratio = 5*dist / map.windowW
        controls = Math.round(ratio * WALK_DENSITY)
      }

      // query should be on top of circle:
      origin = [origin[0], origin[1] + dist]
      var walk = [q]
      for (var i = 1; i < controls-1; i++){
        var ang = angle * i/(controls-1)
        var x = origin[0] + dist * Math.cos(ang - Math.PI/2)
        var y = origin[1] + dist * Math.sin(ang - Math.PI/2)

        for (let j = 1; j <= 3; j++){
          let next = map.findPoint([x, y], j)
          if (!walk.includes(next)){
            walk.push(next)
            break
          }
        }
      }
      //walk[walk.length-1] = q // !
      let walkObj = new Walk(map, walk, true)
      walkObj.isLoop = true
      return walkObj
    }

    static journey(map, from, to, controls, k){
        // Factory: build walk starting at one query and ending at another

        let walk = [from]
        let fromPt = map.proj[from]
        let toPt = map.proj[to]

        if (controls == "auto"){
          let walkDist = euclDist(fromPt, toPt)
          let modifier = RELATIVE_JOURNEY_DENSITY ? map.windowW : JOURNEY_DENSITY
          let ratio = walkDist / modifier
          controls = Math.round(ratio * 2 * WALK_DENSITY)
        }

        

        for (let i = 1; i < controls; i++){
            let x = fromPt[0] + (toPt[0] - fromPt[0]) * (i/controls)
            let y = fromPt[1] + (toPt[1] - fromPt[1]) * (i/controls)

            for (let j = 1; j <= 5; j++){
              let pick = Math.trunc(Math.random() * k) + 1
              let next = map.findPoint([x, y], pick)
              if (!walk.includes(next)){
                walk.push(next)
                break
              }
            }
        }
        walk.push(to)

        return new Walk(map, walk, true)
    }
  
  }
  