import {
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Clock,
  Color,
  Line,
  LineBasicMaterial,
  LineLoop,
  Mesh,
  OrthographicCamera,
  PlaneBufferGeometry,
  Scene,
  ShaderMaterial,
  Vector2,
  Vector3,
  WebGLRenderer,
  WebGLRenderTarget,
} from 'three'

import * as dat from 'dat.gui'
import hexRgb from 'hex-rgb'
import WebFont from 'webfontloader'

import baseVertex from './base.vert'
import textFragment from './text.frag'
import persistenceFragment from './persistence.frag'

const MOBILE_BREAKPOINT = 800
const TYPEKIT_WEB_PROJECT_ID = 'cdp4bcs'
const DEFAULT_FONT_FAMILY = 'fleisch-wolf'
const BORDER_PADDING = innerWidth > MOBILE_BREAKPOINT ? 40 : 30
const START_COLOR = '#fff'
const startColorRGB = hexRgb(START_COLOR, { format: 'array' })
const BACKGROUND_COLOR = '#000'
const PERSIST_COLOR = [
  startColorRGB[0] / 255,
  startColorRGB[1] / 255,
  startColorRGB[2] / 255,
]
const TARGET_PERSIST_COLOR = [...PERSIST_COLOR]

const OPTIONS = {
  text: 'play',
  noiseFactor: 1,
  noiseScale: 0.0032,
  rgbPersistFactor: 0.98,
  alphaPersistFactor: 0.97,
  color: START_COLOR,
  borderColor: MOBILE_BREAKPOINT > 800 ? '#111' : '#454545',
  showBorder: true,
  animateColor: false,
  fontFamily: DEFAULT_FONT_FAMILY,
}

const fontFamilies = []
const mousePos = [0, 0]
const targetMousePos = [0, 0]

const renderer = new WebGLRenderer()
{
  renderer.setClearColor(new Color(BACKGROUND_COLOR))
  // renderer.setClearAlpha(0)
  document.getElementsByClassName('content')[0].appendChild(renderer.domElement)
}

const clock = new Clock()
const scene = new Scene()
const fluidScene = new Scene()
const gui = new dat.GUI()

const orthoCamera = new OrthographicCamera(
  -innerWidth / 2,
  innerWidth / 2,
  innerHeight / 2,
  -innerHeight / 2,
  0.1,
  10,
)
{
  orthoCamera.position.set(0, 0, 1)
  orthoCamera.lookAt(new Vector3(0, 0, 0))
}

const texCanvas = document.createElement('canvas')
const texCtx = texCanvas.getContext('2d')

let fluidRenderTarget0 = new WebGLRenderTarget(
  renderer.domElement.clientWidth,
  renderer.domElement.clientHeight,
)
let fluidRenderTarget1 = fluidRenderTarget0.clone()

const fullscreenQuadGeometry = new PlaneBufferGeometry(innerWidth, innerHeight)
const fullscreenQuadMaterial = new ShaderMaterial({
  uniforms: {
    sampler: { value: null },
    time: { value: 0 },
    aspect: { value: innerWidth / innerHeight },
    mousePos: { value: new Vector2(-1, 1) },
    noiseFactor: { value: OPTIONS.noiseFactor },
    noiseScale: { value: OPTIONS.noiseScale },
    rgbPersistFactor: { value: OPTIONS.rgbPersistFactor },
    alphaPersistFactor: { value: OPTIONS.alphaPersistFactor },
  },
  vertexShader: baseVertex,
  fragmentShader: persistenceFragment,
  transparent: true,
})
const fullscreenQuad = new Mesh(fullscreenQuadGeometry, fullscreenQuadMaterial)
fluidScene.add(fullscreenQuad)
const fullscreenBorderVertices = new Float32Array(4 * 2)
fullscreenBorderVertices[0] = -innerWidth / 2 + BORDER_PADDING
fullscreenBorderVertices[1] = innerHeight / 2 - BORDER_PADDING

fullscreenBorderVertices[2] = innerWidth / 2 - BORDER_PADDING
fullscreenBorderVertices[3] = innerHeight / 2 - BORDER_PADDING

fullscreenBorderVertices[4] = innerWidth / 2 - BORDER_PADDING
fullscreenBorderVertices[5] = -innerHeight / 2 + BORDER_PADDING

fullscreenBorderVertices[6] = -innerWidth / 2 + BORDER_PADDING
fullscreenBorderVertices[7] = -innerHeight / 2 + BORDER_PADDING

const fullscreenBorderGeometry = new BufferGeometry()
fullscreenBorderGeometry.setAttribute(
  'position',
  new BufferAttribute(fullscreenBorderVertices, 2),
)
const fullscreenBorderMaterial = new LineBasicMaterial({
  color: OPTIONS.borderColor,
})
const fullscreenBorderMesh = new LineLoop(
  fullscreenBorderGeometry,
  fullscreenBorderMaterial,
)

scene.add(fullscreenBorderMesh)

const planeUnit = innerWidth > innerHeight ? innerHeight : innerWidth
const labelGeometry = new PlaneBufferGeometry(planeUnit, planeUnit)
const labelMaterial = new ShaderMaterial({
  uniforms: {
    sampler: { value: null },
    color: { value: new Vector3(1, 1, 1) },
  },
  vertexShader: baseVertex,
  fragmentShader: textFragment,
  transparent: true,
})
const labelMesh = new Mesh(labelGeometry, labelMaterial)
scene.add(labelMesh)

setGUISettings()
onResize()
setInterval(onColorChange, 3000)
renderer.setAnimationLoop(onAnimLoop)
document.body.addEventListener('mousemove', onMouseMove)
window.addEventListener('resize', onResize)

WebFont.load({
  typekit: {
    id: TYPEKIT_WEB_PROJECT_ID,
  },
  active: onFontActive,
  fontactive: onFontLoaded,
  fontinactive: onFontLoadError,
})

function onAnimLoop() {
  const dt = clock.getDelta()

  if (OPTIONS.animateColor) {
    PERSIST_COLOR[0] += (TARGET_PERSIST_COLOR[0] - PERSIST_COLOR[0]) * dt
    PERSIST_COLOR[1] += (TARGET_PERSIST_COLOR[1] - PERSIST_COLOR[1]) * dt
    PERSIST_COLOR[2] += (TARGET_PERSIST_COLOR[2] - PERSIST_COLOR[2]) * dt
  }

  {
    const mouseSpeed = dt * 5
    mousePos[0] += (targetMousePos[0] - mousePos[0]) * mouseSpeed
    mousePos[1] += (targetMousePos[1] - mousePos[1]) * mouseSpeed

    fullscreenQuadMaterial.uniforms.mousePos.value.x = mousePos[0]
    fullscreenQuadMaterial.uniforms.mousePos.value.y = mousePos[1]
  }

  fullscreenQuadMaterial.uniforms.sampler.value = fluidRenderTarget1.texture
  fullscreenQuadMaterial.uniforms.time.value = clock.getElapsedTime()

  renderer.autoClearColor = false

  renderer.setRenderTarget(fluidRenderTarget0)
  renderer.clearColor()
  renderer.render(fluidScene, orthoCamera)
  labelMesh.material.uniforms.color.value.set(...PERSIST_COLOR)
  renderer.render(scene, orthoCamera)

  renderer.setRenderTarget(null)
  labelMesh.material.uniforms.color.value.set(...PERSIST_COLOR)
  renderer.render(fluidScene, orthoCamera)
  renderer.render(scene, orthoCamera)

  const temp = fluidRenderTarget0
  fluidRenderTarget0 = fluidRenderTarget1
  fluidRenderTarget1 = temp
}

function onColorChange() {
  TARGET_PERSIST_COLOR[0] = Math.random()
  TARGET_PERSIST_COLOR[1] = Math.random()
  TARGET_PERSIST_COLOR[2] = Math.random()
}

function drawText({
  text = OPTIONS.text,
  fontFamily = OPTIONS.fontFamily,
  horizontalPadding = 0.75,
} = {}) {
  const idealCanvasSize = 2048
  const maxTextureSize = Math.min(
    renderer.capabilities.maxTextureSize,
    idealCanvasSize,
  )
  texCanvas.width = maxTextureSize
  texCanvas.height = maxTextureSize

  texCtx.fillStyle = '#fff'
  texCtx.strokeStyle = '#fff'
  texCtx.lineWidth = 1
  texCtx.textAlign = 'center'
  texCtx.textBaseline = 'middle'
  const referenceFontSize = 250
  texCtx.font = `${referenceFontSize}px ${fontFamily}`
  const textWidth = texCtx.measureText(text).width
  const deltaWidth = (texCanvas.width * horizontalPadding) / textWidth
  const fontSise = referenceFontSize * deltaWidth
  texCtx.font = `${fontSise}px ${fontFamily}`
  texCtx.fillText(text, texCanvas.width / 2, texCanvas.height / 2)

  labelMaterial.uniforms.sampler.value = new CanvasTexture(texCanvas)
}

function onMouseMove(e) {
  const x = (e.pageX / innerWidth) * 2 - 1
  const y = (1 - e.pageY / innerHeight) * 2 - 1
  targetMousePos[0] = x
  targetMousePos[1] = y
}

function setGUISettings() {
  gui.add(OPTIONS, 'text').onChange((text) => {
    drawText({ text })
  })
  gui.add(OPTIONS, 'noiseFactor', 0.1, 50, 0.1).onChange((v) => {
    fullscreenQuadMaterial.uniforms.noiseFactor.value = v
  })
  gui.add(OPTIONS, 'noiseScale', 0.002, 0.01, 0.001).onChange((v) => {
    fullscreenQuadMaterial.uniforms.noiseScale.value = v
  })
  gui.add(OPTIONS, 'rgbPersistFactor', 0.01, 0.99, 0.01).onChange((v) => {
    fullscreenQuadMaterial.uniforms.rgbPersistFactor.value = v
  })
  gui.add(OPTIONS, 'alphaPersistFactor', 0.01, 0.99, 0.01).onChange((v) => {
    fullscreenQuadMaterial.uniforms.alphaPersistFactor.value = v
  })
  gui.add(OPTIONS, 'animateColor')
  gui.addColor(OPTIONS, 'color').onChange((v) => {
    const rgba = hexRgb(v, { format: 'array' })
    PERSIST_COLOR[0] = rgba[0] / 255
    PERSIST_COLOR[1] = rgba[1] / 255
    PERSIST_COLOR[2] = rgba[2] / 255
  })
  gui.addColor(OPTIONS, 'borderColor').onChange((v) => {
    fullscreenBorderMaterial.color = new Color(v)
  })
  gui.add(OPTIONS, 'showBorder').onChange((v) => {
    fullscreenBorderMesh.visible = v
  })
}

function onResize(resizeCamera = true, resizeFramebuffers = true) {
  renderer.setSize(innerWidth, innerHeight)
  renderer.setPixelRatio(devicePixelRatio || 1)

  const aspect = innerWidth / innerHeight

  fullscreenQuadMaterial.uniforms.aspect.value = aspect

  if (resizeCamera) {
    orthoCamera.left = -innerWidth / 2
    orthoCamera.right = innerWidth / 2
    orthoCamera.top = innerHeight / 2
    orthoCamera.bottom = -innerHeight / 2
    orthoCamera.aspect = aspect
    orthoCamera.updateProjectionMatrix()
  }

  if (resizeFramebuffers) {
    fluidRenderTarget0.setSize(
      renderer.domElement.clientWidth,
      renderer.domElement.clientHeight,
    )
    fluidRenderTarget1.setSize(
      renderer.domElement.clientWidth,
      renderer.domElement.clientHeight,
    )
  }
}

function onFontActive() {
  document.body.classList.remove('loading')
  gui
    .add(OPTIONS, 'fontFamily', fontFamilies)
    .onChange((fontFamily) => drawText({ fontFamily }))
}

function onFontLoaded(familyName, fvd) {
  fontFamilies.push(familyName)

  console.log(`loaded: ${familyName} ${fvd}`)

  if (familyName === DEFAULT_FONT_FAMILY) {
    drawText()
  }
}

function onFontLoadError(familyName, fvd) {
  console.error(`Could not load ${familyName} ${fvd}`)
}
