var doc = document

fix m; 
(doc.createElement('div'){
  doc.body.appendChild($)
  $.style.width = '1cm'
  m = 100 * $.offsetWidth 
  doc.body.removeChild($)
})

fix Range = #(b, e) {
  var xs = []
  for(var i = 0, x = b; x < e; ++i, ++x) {
    xs[i] = x
  }
  -> xs
}

fix Point2D = #{
  var @ = {
    x: 0,
    y: 0,
    _eq: #(p) { -> @.x == p.x && @.y == p.y },
    _add: #(p) { -> Point2D(){ $.x = @.x + p.x; $.y = @.y + p.y } },
    _sub: #(p) { -> Point2D(){ $.x = @.x - p.x; $.y = @.y - p.y } },
    _mulS: #(a) { -> Point2D(){ $.x = @.x * a; $.y = @.y * a } },
    _scale: #(p) { -> Point2D(){ $.x = @.x * p.x; $.y = @.y * p.y } },
  }
  -> @
}

fix _eq = #(a, b) {
  -> (a._eq) ? a._eq(b) : a == b
}

fix Set = #{
  var @ = {
    els: [],
    __find: #(el) {
      -> @.els._find(#(v){ -> _eq(el, v) })
    },
    _has: #(el) {
      -> @.__find(el) != @.els.length
    },
    _add: #(el) {
      if(!@._has(el))
        @.els._push(el)
    },
    _del: #(el) {
      fix k = @.__find(el)
      if(k != @.els.length)
        @.els.splice(k, 1)
    },
    _each: #(_fn) { 
      -> @.els._each(_fn) 
    },
    _orSelf: #(set) {
      set._each(#(v){ @._add(v) })
    }
  }
  -> @
}

fix PuzzleEl = #{
  var @ = {
    mapPos: Point2D(),
    pos: Point2D(),
    // dim: Point2D(),
    view: null,
    group: Set(){ $._add(@) },
    joints: Set(),
    _synchView: #{
      @.view.style{
        $.left = `%{ Math.round(@.pos.x) }px`
        $.top = `%{ Math.round(@.pos.y) }px`
      }
    },
  }
  -> @
}

fix Puzzle = #{
  var @ = {
    view: null,
    elDim: Point2D(),
    elss: [[]],
    dragUI: DragUI(),
    _attachToView: #{
      @.dragUI{ 
        $.view = @.view 
        $._attachToView()
        // $._onDrag = @._onDrag
        $._onDraw = @._onDraw
        $._onDrop = @._onDrop
      }
    },
    _create: #(img) {
      fix minD = 3 * (1e-2 * m)
      fix iW = img.width
      fix iH = img.height
      fix cW = Math.floor(iW / minD)
      fix cH = Math.floor(iH / minD)
      _log(cW, cH)
      @.view.innerHTML = '' // clear container
      @.elDim = Point2D(){ $.x = (iW / cW)._floor(); $.y = (iH / cH)._floor() } 
      @.elss = Range(0, cH)._map(#(yI) {
        -> Range(0, cW)._map(#(xI) {
          -> PuzzleEl(){ 
            $.mapPos = Point2D(){ $.x = xI; $.y = yI }
            $.view = doc.createElement('div'){
              $.classList{
                $.add('PuzzleEl')
                $.add('dragable')
              }  
              fix x = Math.round(iW * xI / cW)
              fix y = Math.round(iH * yI / cH)
              $.style{
                $.background = `url(%{ img.src }) %{ (-x)._floor() }px  %{ (-y)._floor() }px`
                // $.left = x + 'px'  // temp
                // $.top = y + 'px' // temp
                $.width = @.elDim.x
                $.height = @.elDim.y
                $.zIndex = 0 //yI * cW + xI
              }
            }
            $.view.model = $
            @.view.appendChild($.view)
          }
        })
      })
      @._shuffle()
      @.dragUI.lastEl = @.elss._last()._last()
    },
    _shuffle: #{
      fix cW = @.elss[0].length
      fix cH = @.elss.length
      @.elss._each(#(els, yI){
        els._each(#(el, xI){
          el.pos = Point2D(){ 
            $.x = Math.random() * (cW - 1) * @.elDim.x  
            $.y = Math.random() * (cH - 1) * @.elDim.y
          }
          el.group = Set(){ $._add(el) }
          el.joints{
            if(xI == 0)
              $._add(Point2D(){ $.x = -1 })
            if(xI == cW - 1)
              $._add(Point2D(){ $.x = 1 })
            if(yI == 0)
              $._add(Point2D(){ $.y = -1 })
            if(yI == cH - 1)
              $._add(Point2D(){ $.y = 1 })
          }
          el._synchView()
        })
      })
    },
    _joinGroups: #(group, group2) {
      //fix _z = #(group){ -> group.els[0].view.style.zIndex }
      //fix maxZ = Math.max(_z(group), _z(group))
      group2._each(#(v){
        v.group = group
      })
      group._orSelf(group2)
      //group._each(#(v){
      //  v.view.style.zIndex = maxZ
      //})
    },
    _tryJoinEl: #(el) {
      fix gluePr = 0.10
      fix cp = el.pos._add(@.elDim._mulS(0.5))
      fix _testAndJoin = #(p) {
        if(el.joints._has(p))
          ->
        //fix probeP = cp._add(@.elDim._scale(0.5 * (1 + gluePr)))
        fix probeP = cp._add(@.elDim._mulS(0.5 + gluePr)._scale(p))
        fix view = doc.elementFromPoint(probeP.x, probeP.y)
        if(view == null)
          view = doc
        //_log(view)
        while(view != doc && !view.classList.contains('PuzzleEl'))
          view = view.parentNode
        if(view == doc)
          ->
        fix puzzleEl = view.model
        if(puzzleEl == el) // bug
          ->
        fix diff = (el.pos._sub(puzzleEl.pos))._sub(
          (el.mapPos._sub(puzzleEl.mapPos))._scale(@.elDim)        
        )
        //_log(p, diff, @.elDim._mulS(gluePr))
        if(diff.x._abs() >= @.elDim.x * gluePr 
          || diff.y._abs() >= @.elDim.y * gluePr
        )
          ->
        _log('_add', p, diff)
        el.joints._add(p)
        puzzleEl.joints._add(p._mulS(-1))
        @._joinGroups(el.group, puzzleEl.group)
        @._onDraw(el, el.pos)
      }
      _testAndJoin(Point2D(){ $.x = 1 })
      _testAndJoin(Point2D(){ $.x = -1 })
      _testAndJoin(Point2D(){ $.y = 1 })
      _testAndJoin(Point2D(){ $.y = -1 })
    },
    _onDraw: #(el, p) {
      el.group._each(#(v){
        v.pos = p._add(
          v.mapPos._sub(el.mapPos)._scale(@.elDim)
        )
        v._synchView()
      })
    },
    _onDrop: #(el, p) {
      el.group._each(#(el){
        @._tryJoinEl(el)
      })
    }
  }
  -> @
}

fix DragUI = #{
  var @ = {
    lastEl: null,
    nextZ: 1,
    dragOrigin: Point2D(),
    lastPoint: Point2D(),
    drawTimeoutId: -1,
    view: null,
    _attachToView: #{
      @.view{
        $.addEventListener('mousedown', @._onMouseDown)
        $.addEventListener('mouseup', @._onMouseUp)
      }
    },
    _onMouseDown: #(e) {
      fix v = e.target
      while(v != null && !v.classList.contains('dragable'))
        v = v.parentNode
      fix oldEl = @.lastEl
      @.lastEl = v.model
      
      /*
      // swap zIndex'es
      fix oldZ = oldEl.view.style.zIndex
      fix newZ = @.lastEl.view.style.zIndex
      oldEl.group._each(#(v){
        v.view.style.zIndex = newZ
      })
      */
      @.lastEl.group._each(#(v) {
        v.view.style.zIndex = @.nextZ
      })
      @.nextZ++
      // calc @.dragOrigin
      @.dragOrigin{
        $.x = e.x - v.offsetLeft
        $.y = e.y - v.offsetTop
      }
      
      doc.addEventListener('mousemove', @._onMouseMove)
      @._onDrag(@.lastEl)
    },
    _onMouseMove: #(e) {
      if(@.drawTimeoutId == -1)
      {  
        @.drawTimeoutId = setTimeout(
          #{ 
            @._onDraw(@.lastEl, @.lastPoint)
            @.drawTimeoutId = -1 
          }, 
          1000 / 25
        )
      }  
      @.lastPoint = Point2D(){
        $.x = e.x
        $.y = e.y
      }._sub(@.dragOrigin)  
    },
    _onMouseUp: #(e) {
      doc.removeEventListener('mousemove', @._onMouseMove)
      @._onDrop(@.lastEl, @.lastPoint)
    },
    _onDrag: #(el) {
      // fill me
    },
    _onDraw: #(el, p) {
      // fill me
    },
    _onDrop: #(el, p) {
      // fill me
    },
  }
  -> @
}

_log(m)

;(#{
  var img = new Image()
  img{
    $.onload = #{
      var puzzle = Puzzle(){
        $.view = doc.all.Puzzle
        $._attachToView()
        $._create(img)
      }
    }
    $.src = SafeJS.Host.args[1] 
  }
})()  