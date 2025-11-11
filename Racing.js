<rosieArtifact title="AI Rival Tank Racers">
<rosieCreate file="aiOpponent.js">
<![CDATA[
import * as THREE from 'three';

export class AIOpponent {
  constructor(gltf, scene, trackManager, startDelay = 0) {
    this.scene = scene;
    this.trackManager = trackManager;
    
    // Clone the tank model
    this.mesh = gltf.scene.clone();
    this.mesh.scale.set(1.5, 1.5, 1.5);
    
    // Random color tint for AI tanks
    const colors = [0xff4444, 0x4444ff, 0x44ff44, 0xffff44, 0xff44ff];
    const color = colors[Math.floor(Math.random() * colors.length)];
    
    this.mesh.traverse(child => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        // Tint the material
        if (child.material) {
          child.material = child.material.clone();
          child.material.color.setHex(color);
        }
      }
    });
    
    this.scene.add(this.mesh);
    
    // Animation setup
    this.mixer = new THREE.AnimationMixer(this.mesh);
    this.animations = {};
    gltf.animations.forEach(clip => {
      const clonedClip = clip.clone();
      this.animations[clip.name] = this.mixer.clipAction(clonedClip);
    });
    
    // AI properties
    this.speed = 0;
    this.baseSpeed = 80 + Math.random() * 25; // Random skill level
    this.maxSpeed = this.baseSpeed * 1.5;
    this.acceleration = 35 + Math.random() * 10;
    this.turnSpeed = 2.0 + Math.random() * 0.8;
    this.currentTargetIndex = Math.floor(Math.random() * 5); // Start at random point
    this.startDelay = startDelay;
    this.raceTime = startDelay;
    
    // Racing stats
    this.currentLap = 1;
    this.currentCheckpoint = 0;
    this.totalDistance = 0;
    this.isFinished = false;
    
    // Position at first waypoint
    this.positionAtWaypoint();
  }
  
  positionAtWaypoint() {
    const trackPoints = this.getTrackPoints();
    if (trackPoints.length === 0) return;
    
    const point = trackPoints[this.currentTargetIndex];
    this.mesh.position.copy(point);
    
    // Face forward
    const nextIndex = (this.currentTargetIndex + 1) % trackPoints.length;
    const nextPoint = trackPoints[nextIndex];
    const direction = new THREE.Vector3().subVectors(nextPoint, point).normalize();
    const angle = Math.atan2(direction.x, direction.z);
    this.mesh.rotation.y = angle;
  }
  
  getTrackPoints() {
    // Get the racing line points from track
    const checkpoints = this.trackManager.checkpoints;
    if (checkpoints.length === 0) return [];
    
    // Create smooth racing line with more points
    const curve = new THREE.CatmullRomCurve3(checkpoints, true);
    return curve.getPoints(100);
  }
  
  update(deltaTime) {
    if (this.isFinished) return;
    
    // Handle start delay
    if (this.startDelay > 0) {
      this.startDelay -= deltaTime;
      return;
    }
    
    this.raceTime += deltaTime;
    
    const trackPoints = this.getTrackPoints();
    if (trackPoints.length === 0) return;
    
    // Get target point
    const targetPoint = trackPoints[this.currentTargetIndex];
    const currentPos = this.mesh.position;
    
    // Calculate direction to target
    const direction = new THREE.Vector3().subVectors(targetPoint, currentPos);
    const distance = direction.length();
    direction.normalize();
    
    // Check if reached waypoint
    if (distance < 3) {
      this.currentTargetIndex = (this.currentTargetIndex + 1) % trackPoints.length;
      
      // Track progress through checkpoints
      const checkpointsPerLap = this.trackManager.checkpoints.length;
      const pointsPerCheckpoint = Math.floor(trackPoints.length / checkpointsPerLap);
      
      if (this.currentTargetIndex % pointsPerCheckpoint === 0) {
        this.currentCheckpoint++;
        if (this.currentCheckpoint >= checkpointsPerLap) {
          this.currentCheckpoint = 0;
          this.currentLap++;
        }
      }
      
      this.totalDistance += distance;
    }
    
    // Calculate desired rotation
    const targetAngle = Math.atan2(direction.x, direction.z);
    let currentAngle = this.mesh.rotation.y;
    
    // Smooth rotation toward target
    let angleDiff = targetAngle - currentAngle;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    
    const maxTurn = this.turnSpeed * deltaTime;
    angleDiff = Math.max(-maxTurn, Math.min(maxTurn, angleDiff));
    this.mesh.rotation.y += angleDiff;
    
    // Accelerate based on corner difficulty
    const turnSharpness = Math.abs(angleDiff) / maxTurn;
    const speedMultiplier = 1.0 - turnSharpness * 0.4; // Slow down in corners
    
    const targetSpeed = this.baseSpeed * speedMultiplier;
    
    if (this.speed < targetSpeed) {
      this.speed = Math.min(this.speed + this.acceleration * deltaTime, targetSpeed);
    } else {
      this.speed = Math.max(this.speed - this.acceleration * deltaTime * 0.5, targetSpeed);
    }
    
    // Move forward
    const forward = new THREE.Vector3(0, 0, -1);
    forward.applyEuler(new THREE.Euler(0, this.mesh.rotation.y, 0));
    this.mesh.position.add(forward.multiplyScalar(this.speed * deltaTime));
    
    // Play appropriate animation
    if (this.speed > 20) {
      this.playAnimation('TankArmature|Tank_Forward');
    }
    
    // Update animations
    if (this.mixer) {
      this.mixer.update(deltaTime);
    }
  }
  
  playAnimation(name) {
    const targetAction = this.animations[name];
    if (!targetAction || targetAction.isRunning()) return;
    
    Object.values(this.animations).forEach(action => {
      action.fadeOut(0.2);
    });
    
    targetAction.reset().fadeIn(0.2).play();
  }
  
  getRaceProgress() {
    const trackPoints = this.getTrackPoints();
    const totalPoints = trackPoints.length;
    const progress = this.currentTargetIndex / totalPoints;
    return this.currentLap - 1 + progress;
  }
  
  reset() {
    this.speed = 0;
    this.currentTargetIndex = Math.floor(Math.random() * 5);
    this.currentLap = 1;
    this.currentCheckpoint = 0;
    this.totalDistance = 0;
    this.raceTime = this.startDelay;
    this.isFinished = false;
    this.positionAtWaypoint();
  }
  
  destroy() {
    this.scene.remove(this.mesh);
  }
}
]]>
</rosieCreate>

<rosieEdit file="main.js">
<![CDATA[
<<<<<<< HEAD
import { TankVehicle } from './vehicle.js';
import { TrackManager } from './track.js';
import { RaceManager } from './raceManager.js';
import { UIManager } from './ui.js';
=======
import { TankVehicle } from './vehicle.js';
import { TrackManager } from './track.js';
import { RaceManager } from './raceManager.js';
import { UIManager } from './ui.js';
import { AIOpponent } from './aiOpponent.js';
>>>>>>> updated
]]>
</rosieEdit>

<rosieEdit file="main.js">
<![CDATA[
<<<<<<< HEAD
    this.clock = new THREE.Clock();
    this.loader = new GLTFLoader();
=======
    this.clock = new THREE.Clock();
    this.loader = new GLTFLoader();
    this.aiOpponents = [];
>>>>>>> updated
]]>
</rosieEdit>

<rosieEdit file="main.js">
<![CDATA[
<<<<<<< HEAD
  async loadAssets() {
    try {
      const tankGltf = await this.loader.loadAsync('https://play.rosebud.ai/assets/Tank-Cw3Zvvkmom.glb?ALas');
      
      this.vehicle = new TankVehicle(tankGltf, this.scene);
      
      this.trackManager = new TrackManager(this.scene);
      this.trackManager.buildTrack(0);
=======
  async loadAssets() {
    try {
      const tankGltf = await this.loader.loadAsync('https://play.rosebud.ai/assets/Tank-Cw3Zvvkmom.glb?ALas');
      
      this.tankGltf = tankGltf; // Store for AI opponents
      this.vehicle = new TankVehicle(tankGltf, this.scene);
      
      this.trackManager = new TrackManager(this.scene);
      this.trackManager.buildTrack(0);
      
      // Spawn AI opponents
      this.spawnAIOpponents();
>>>>>>> updated
]]>
</rosieEdit>

<rosieEdit file="main.js">
<![CDATA[
<<<<<<< HEAD
      this.raceManager = new RaceManager(this.vehicle, this.trackManager);
      this.uiManager = new UIManager(this.raceManager);
=======
      this.raceManager = new RaceManager(this.vehicle, this.trackManager, this.aiOpponents);
      this.uiManager = new UIManager(this.raceManager);
>>>>>>> updated
]]>
</rosieEdit>

<rosieEdit file="main.js">
<![CDATA[
<<<<<<< HEAD
  }

  setupTrackSelector() {
=======
  }

  spawnAIOpponents() {
    // Clear existing AI opponents
    this.aiOpponents.forEach(ai => ai.destroy());
    this.aiOpponents = [];
    
    // Spawn 3-5 AI opponents with staggered starts
    const numOpponents = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < numOpponents; i++) {
      const ai
