import React, { useState, useEffect, useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  withRepeat, 
  withSequence,
  Easing 
} from 'react-native-reanimated';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;

const SHIP_WIDTH = 64;
const SHIP_HEIGHT = 90;
const ASTEROID_SIZE = 52;
const SHIP_BOTTOM_OFFSET = 140;
const MOVE_STEP = 40;
const HIGH_SCORE_KEY = '@space_escape_high_score';

export default function Index() {
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [gameRunning, setGameRunning] = useState(false);
  const [gameOver, setGameOver] = useState(false);

  // Core Game Loop State
  const [shipX, setShipX] = useState(SCREEN_WIDTH / 2 - SHIP_WIDTH / 2);
  const [asteroidX, setAsteroidX] = useState(0);
  const [asteroidY, setAsteroidY] = useState(0);

  // Animation Shared Values
  const shipXAnim = useSharedValue(SCREEN_WIDTH / 2 - SHIP_WIDTH / 2);
  const flameScale = useSharedValue(1);
  const asteroidRotation = useSharedValue(0);

  const shipXRef = useRef(shipX);
  const asteroidXRef = useRef(asteroidX);
  const asteroidYRef = useRef(asteroidY);
  const gameLoopRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Sync animation with position changes
  useEffect(() => {
    shipXRef.current = shipX;
    shipXAnim.value = withTiming(shipX, { duration: 100, easing: Easing.out(Easing.quad) });
  }, [shipX]);

  // Handle subtle flame and asteroid rotation effects loop
  useEffect(() => {
    flameScale.value = withRepeat(
      withSequence(
        withTiming(1.3, { duration: 150 }),
        withTiming(0.9, { duration: 150 })
      ),
      -1,
      true
    );

    asteroidRotation.value = withRepeat(
      withTiming(360, { duration: 3000, easing: Easing.linear }),
      -1,
      false
    );
  }, []);

  // Load Highscore
  useEffect(() => {
    const loadHighScore = async () => {
      try {
        const saved = await AsyncStorage.getItem(HIGH_SCORE_KEY);
        if (saved !== null) {
          setHighScore(parseInt(saved, 10));
        }
      } catch (error) {
        console.log('Failed to load high score:', error);
      }
    };
    loadHighScore();
  }, []);

  const saveHighScore = async (newHighScore: number) => {
    try {
      await AsyncStorage.setItem(HIGH_SCORE_KEY, newHighScore.toString());
    } catch (error) {
      console.log('Failed to save high score:', error);
    }
  };

  const moveLeft = () => {
    setShipX((prevX) => {
      const newX = prevX - MOVE_STEP;
      return newX < 0 ? 0 : newX;
    });
  };

  const moveRight = () => {
    setShipX((prevX) => {
      const newX = prevX + MOVE_STEP;
      const maxX = SCREEN_WIDTH - SHIP_WIDTH;
      return newX > maxX ? maxX : newX;
    });
  };

  const spawnAsteroid = () => {
    const randomX = Math.random() * (SCREEN_WIDTH - ASTEROID_SIZE);
    asteroidXRef.current = randomX;
    asteroidYRef.current = 0;
    setAsteroidX(randomX);
    setAsteroidY(0);
  };

  const resetPositions = () => {
    const initialShipX = SCREEN_WIDTH / 2 - SHIP_WIDTH / 2;
    setShipX(initialShipX);
    shipXRef.current = initialShipX;
    spawnAsteroid();
  };

  const checkCollision = () => {
    const shipTop = SCREEN_HEIGHT - SHIP_BOTTOM_OFFSET - SHIP_HEIGHT;
    const shipLeft = shipXRef.current;
    const shipRight = shipLeft + SHIP_WIDTH;
    const shipBottom = shipTop + SHIP_HEIGHT;

    const astLeft = asteroidXRef.current;
    const astRight = astLeft + ASTEROID_SIZE;
    const astTop = asteroidYRef.current;
    const astBottom = astTop + ASTEROID_SIZE;

    const horizontalOverlap = shipLeft < astRight && shipRight > astLeft;
    const verticalOverlap = shipTop < astBottom && shipBottom > astTop;

    return horizontalOverlap && verticalOverlap;
  };

  const startGame = () => {
    setScore(0);
    setGameOver(false);
    setGameRunning(true);
    resetPositions();

    gameLoopRef.current = setInterval(() => {
      asteroidYRef.current += 9; // Slightly accelerated pace for a better game challenge
      setAsteroidY(asteroidYRef.current);

      if (checkCollision()) {
        endGame();
        return;
      }

      if (asteroidYRef.current > SCREEN_HEIGHT) {
        setScore((prev) => prev + 1);
        spawnAsteroid();
      }
    }, 30);
  };

  const restartGame = () => {
    if (gameLoopRef.current) {
      clearInterval(gameLoopRef.current);
      gameLoopRef.current = null;
    }
    startGame();
  };

  const endGame = () => {
    if (gameLoopRef.current) {
      clearInterval(gameLoopRef.current);
      gameLoopRef.current = null;
    }
    setGameRunning(false);
    setGameOver(true);

    setScore((currentScore) => {
      if (currentScore > highScore) {
        setHighScore(currentScore);
        saveHighScore(currentScore);
      }
      return currentScore;
    });
  };

  useEffect(() => {
    return () => {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
      }
    };
  }, []);

  // Animated Styles
  const animatedShipStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shipXAnim.value }],
  }));

  const animatedFlameStyle = useAnimatedStyle(() => ({
    transform: [{ scaleY: flameScale.value }],
  }));

  const animatedAsteroidStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${asteroidRotation.value}deg` }],
  }));

  return (
    <LinearGradient colors={['#060814', '#0B112C', '#131132']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" />

        {/* Floating background stars */}
        <View style={[styles.star, { top: '15%', left: '20%' }]} />
        <View style={[styles.star, { top: '40%', left: '75%', width: 3, height: 3 }]} />
        <View style={[styles.star, { top: '70%', left: '10%' }]} />
        <View style={[styles.star, { top: '85%', left: '80%', width: 3, height: 3 }]} />

        <Text style={styles.title}>SPACE ESCAPE</Text>

        <View style={styles.scoreRow}>
          <View style={styles.scoreContainer}>
            <Text style={styles.scoreLabel}>Score</Text>
            <Text style={styles.scoreValue}>{score}</Text>
          </View>
          <View style={styles.scoreContainer}>
            <Text style={styles.scoreLabel}>Best</Text>
            <Text style={styles.highScoreValue}>{highScore}</Text>
          </View>
        </View>

        {!gameRunning && !gameOver && (
          <View style={styles.menuContainer}>
            <Ionicons name="rocket-outline" size={80} color="#00E5FF" style={styles.menuIcon} />
            <TouchableOpacity style={styles.startButton} onPress={startGame}>
              <Text style={styles.startButtonText}>LAUNCH MISSILE</Text>
            </TouchableOpacity>
          </View>
        )}

        {gameOver && (
          <View style={styles.gameOverBox}>
            <Ionicons name="alert-circle-outline" size={64} color="#FF3B30" />
            <Text style={styles.gameOverText}>CRASH DETECTED</Text>
            <Text style={styles.finalScoreText}>Final Score: {score}</Text>
            <TouchableOpacity style={[styles.startButton, { backgroundColor: '#FF3B30' }]} onPress={restartGame}>
              <Text style={[styles.startButtonText, { color: '#FFF' }]}>REDEPLOY</Text>
            </TouchableOpacity>
          </View>
        )}

        {gameRunning && (
          <>
            <TouchableOpacity style={styles.restartButton} onPress={restartGame}>
              <Ionicons name="refresh" size={16} color="#00E5FF" />
              <Text style={styles.restartButtonText}>RESET</Text>
            </TouchableOpacity>

            <View style={styles.gameArea}>
              {/* Asteroid Rendering */}
              <Animated.View 
                style={[
                  styles.asteroidWrap, 
                  { left: asteroidX, top: asteroidY },
                  animatedAsteroidStyle
                ]}
              >
                <View style={styles.asteroidBase} />
                <View style={styles.craterOne} />
                <View style={styles.craterTwo} />
                <View style={styles.craterThree} />
                <View style={styles.asteroidSpike1} />
                <View style={styles.asteroidSpike2} />
              </Animated.View>

              {/* Spaceship Rendering */}
              <Animated.View 
                style={[
                  styles.shipContainer, 
                  { bottom: SHIP_BOTTOM_OFFSET },
                  animatedShipStyle
                ]}
              >
                <View style={styles.shipNose} />
                <View style={styles.shipBody}>
                  <View style={styles.shipShieldGlow} />
                  <View style={styles.shipWindow} />
                </View>
                <View style={styles.wingLeft} />
                <View style={styles.wingRight} />
                <View style={styles.thrusterGlow} />
                <Animated.View style={[styles.shipFlame, animatedFlameStyle]} />
              </Animated.View>
            </View>

            <View style={styles.controlsRow}>
              <TouchableOpacity style={styles.controlButton} onPress={moveLeft} activeOpacity={0.7}>
                <Ionicons name="arrow-back" size={32} color="#00E5FF" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.controlButton} onPress={moveRight} activeOpacity={0.7}>
                <Ionicons name="arrow-forward" size={32} color="#00E5FF" />
              </TouchableOpacity>
            </View>
          </>
        )}
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 20,
  },
  star: {
    position: 'absolute',
    width: 2,
    height: 2,
    backgroundColor: '#FFF',
    opacity: 0.4,
    borderRadius: 1,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 12,
    letterSpacing: 3,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 229, 255, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  scoreRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 20,
  },
  scoreContainer: {
    alignItems: 'center',
    backgroundColor: 'rgba(21, 26, 46, 0.7)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: 10,
    paddingHorizontal: 28,
    borderRadius: 20,
    minWidth: 120,
  },
  scoreLabel: {
    fontSize: 11,
    color: '#8A8FA3',
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  scoreValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#00E5FF',
  },
  highScoreValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFD65D',
  },
  menuContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 30,
  },
  menuIcon: {
    textShadowColor: 'rgba(0, 229, 255, 0.4)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 15,
  },
  startButton: {
    backgroundColor: '#00E5FF',
    paddingVertical: 18,
    paddingHorizontal: 40,
    borderRadius: 30,
    shadowColor: '#00E5FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 8,
  },
  startButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#060814',
    letterSpacing: 1.5,
  },
  gameOverBox: {
    position: 'absolute',
    top: '35%',
    alignItems: 'center',
    backgroundColor: 'rgba(21, 26, 46, 0.95)',
    borderWidth: 1.5,
    borderColor: '#FF3B30',
    padding: 32,
    borderRadius: 24,
    width: SCREEN_WIDTH * 0.8,
    gap: 12,
  },
  gameOverText: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FF3B30',
    letterSpacing: 2,
  },
  finalScoreText: {
    fontSize: 18,
    color: '#FFFFFF',
    marginBottom: 10,
  },
  restartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-end',
    marginRight: 24,
    marginBottom: 10,
    backgroundColor: 'rgba(21, 26, 46, 0.6)',
    borderWidth: 1,
    borderColor: '#00E5FF',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  restartButtonText: {
    color: '#00E5FF',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  gameArea: {
    flex: 1,
    width: '100%',
  },
  asteroidWrap: {
    position: 'absolute',
    width: ASTEROID_SIZE,
    height: ASTEROID_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  asteroidBase: {
    width: ASTEROID_SIZE - 4,
    height: ASTEROID_SIZE - 4,
    borderRadius: (ASTEROID_SIZE - 4) / 2,
    backgroundColor: '#4E495A',
    borderWidth: 2,
    borderColor: '#2F2A38',
  },
  craterOne: {
    position: 'absolute',
    top: 10,
    left: 12,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#2F2A38',
    opacity: 0.6,
  },
  craterTwo: {
    position: 'absolute',
    top: 26,
    left: 28,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2F2A38',
    opacity: 0.6,
  },
  craterThree: {
    position: 'absolute',
    top: 30,
    left: 10,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#2F2A38',
    opacity: 0.6,
  },
  asteroidSpike1: {
    position: 'absolute',
    width: 10,
    height: 10,
    backgroundColor: '#4E495A',
    transform: [{ rotate: '45deg' }],
    top: 2,
    right: 6,
    zIndex: -1,
  },
  asteroidSpike2: {
    position: 'absolute',
    width: 12,
    height: 12,
    backgroundColor: '#4E495A',
    transform: [{ rotate: '15deg' }],
    bottom: 4,
    left: 4,
    zIndex: -1,
  },
  shipContainer: {
    position: 'absolute',
    width: SHIP_WIDTH,
    height: SHIP_HEIGHT,
    alignItems: 'center',
  },
  shipNose: {
    width: 0,
    height: 0,
    borderLeftWidth: 14,
    borderRightWidth: 14,
    borderBottomWidth: 24,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#FFFFFF',
    zIndex: 2,
  },
  shipBody: {
    width: 28,
    height: 44,
    backgroundColor: '#E0F7FA',
    borderLeftWidth: 2,
    borderRightWidth: 2,
    borderColor: '#00E5FF',
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -4,
    zIndex: 1,
  },
  shipShieldGlow: {
    position: 'absolute',
    width: 36,
    height: 52,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 229, 255, 0.4)',
  },
  shipWindow: {
    width: 10,
    height: 16,
    borderRadius: 5,
    backgroundColor: '#060814',
    borderWidth: 1.5,
    borderColor: '#00E5FF',
  },
  wingLeft: {
    position: 'absolute',
    top: 36,
    left: 4,
    width: 14,
    height: 30,
    backgroundColor: '#00B8D4',
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 4,
  },
  wingRight: {
    position: 'absolute',
    top: 36,
    right: 4,
    width: 14,
    height: 30,
    backgroundColor: '#00B8D4',
    borderTopRightRadius: 16,
    borderBottomRightRadius: 4,
  },
  thrusterGlow: {
    width: 16,
    height: 6,
    backgroundColor: '#00E5FF',
    marginTop: -1,
  },
  shipFlame: {
    width: 0,
    height: 0,
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderTopWidth: 20,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#FF9100',
    marginTop: 1,
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 40,
    paddingBottom: 40,
  },
  controlButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(21, 26, 46, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#00E5FF',
    shadowColor: '#00E5FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 5,
  },
});