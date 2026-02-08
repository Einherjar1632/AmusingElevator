import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Linking,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  LogBox,
  Text,
  View,
} from 'react-native';
import { Audio } from 'expo-av';

type DoorState = 'open' | 'closed';
type Direction = 'up' | 'down' | 'stop';

type FloorShop = {
  icon: string;
  name: string;
  subtitle: string;
  color: string;
};
type AnimalGreeter = {
  emoji: string;
  name: string;
  bg: string;
};
type SoundKey =
  | 'signal'
  | 'signal2'
  | 'upVoice'
  | 'downVoice'
  | 'doorMove'
  | 'moveMotor'
  | 'doorOpenVoice'
  | 'doorCloseVoice';

const DEFAULT_SHOP: FloorShop = {
  icon: '🏢',
  name: 'フロアガイド',
  subtitle: 'おみせじょうほう じゅんびちゅう',
  color: '#F4F4F4',
};

const FLOORS = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1] as const;

const FLOOR_SHOPS: Record<number, FloorShop> = {
  10: { icon: '🎮', name: 'おもちゃワールド', subtitle: 'ゲームと おもちゃの だいしゅうごう', color: '#FCEFD9' },
  9: { icon: '📚', name: 'えほんひろば', subtitle: 'えほんと ずかんの フロア', color: '#EAF5FF' },
  8: { icon: '👕', name: 'こどもふく', subtitle: 'キッズファッション コーナー', color: '#FFEAF2' },
  7: { icon: '🍽️', name: 'ファミリーしょくどう', subtitle: 'おこさまランチ だいにんき', color: '#FFF0D8' },
  6: { icon: '🧸', name: 'ぬいぐるみのへや', subtitle: 'かわいい どうぶつが いっぱい', color: '#F6ECFF' },
  5: { icon: '🍰', name: 'おかしマルシェ', subtitle: 'ケーキと クッキーの かおり', color: '#FFF2E6' },
  4: { icon: '🖍️', name: 'アートラボ', subtitle: 'おえかきと こうさく たいけん', color: '#E9FAF2' },
  3: { icon: '🚂', name: 'のりものランド', subtitle: 'でんしゃと くるまの うりば', color: '#EDF3FF' },
  2: { icon: '🎒', name: 'スクールショップ', subtitle: 'えんぴつ と ノート を そろえよう', color: '#F0F8E9' },
  1: { icon: '🌟', name: 'エントランス', subtitle: 'いらっしゃいませ', color: '#FFF8CC' },
};

const ELEVATOR_HEIGHT = 440;
const DOOR_TRAVEL = 56;
const DOOR_ANIMATION_MS = 900;
const FLOOR_TRAVEL_MS = 900;
const ARRIVAL_TO_OPEN_ANNOUNCE_MS = 900;
const OPEN_ANNOUNCE_TO_DOOR_OPEN_MS = 400;
const DOOR_DWELL_MS = 1800;
const DEPARTURE_ANNOUNCE_DELAY_MS = 700;
const SOUND_FILES: Record<SoundKey, number> = {
  signal: require('./sounds/elevetor-signal.mp3'),
  signal2: require('./sounds/elevetor-signal2.mp3'),
  upVoice: require('./sounds/uenimairimasu.mp3'),
  downVoice: require('./sounds/sitanimairimasu.mp3'),
  doorMove: require('./sounds/elevetordoor.mp3'),
  moveMotor: require('./sounds/elevetor-up.mp3'),
  doorOpenVoice: require('./sounds/door-hirakimasu.mp3'),
  doorCloseVoice: require('./sounds/door-simarimasu.mp3'),
};
const ANIMAL_GREETERS: AnimalGreeter[] = [
  { emoji: '🐶', name: 'わんちゃん', bg: '#FFE7CC' },
  { emoji: '🐱', name: 'ねこちゃん', bg: '#FFE2F2' },
  { emoji: '🐰', name: 'うさぎさん', bg: '#F1E6FF' },
  { emoji: '🐻', name: 'くまさん', bg: '#FFEBD6' },
  { emoji: '🦁', name: 'らいおんくん', bg: '#FFF0CC' },
  { emoji: '🐼', name: 'ぱんだちゃん', bg: '#EDF2F8' },
  { emoji: '🐨', name: 'こあらさん', bg: '#E7F3FF' },
  { emoji: '🐸', name: 'かえるくん', bg: '#E6FFE6' },
  { emoji: '🐧', name: 'ぺんぎんさん', bg: '#E6F3FF' },
  { emoji: '🦊', name: 'きつねさん', bg: '#FFE9DB' },
  { emoji: '🐹', name: 'はむちゃん', bg: '#FFF1DA' },
  { emoji: '🐯', name: 'とらくん', bg: '#FFE7D1' },
  { emoji: '🦄', name: 'ゆにこーん', bg: '#F6E8FF' },
  { emoji: '🦉', name: 'ふくろうさん', bg: '#ECEFF7' },
  { emoji: '🐥', name: 'ひよこちゃん', bg: '#FFF6CC' },
  { emoji: '🐮', name: 'うしさん', bg: '#F3F1ED' },
  { emoji: '🐷', name: 'ぶたさん', bg: '#FFE4EE' },
  { emoji: '🐵', name: 'おさるさん', bg: '#FCE8D6' },
  { emoji: '🐙', name: 'たこさん', bg: '#FFE6E6' },
  { emoji: '🦕', name: 'きょうりゅうくん', bg: '#E7F7EA' },
];
const DEFAULT_GREETER: AnimalGreeter = { emoji: '🐶', name: 'わんちゃん', bg: '#FFE7CC' };

function getFloorShop(floor: number): FloorShop {
  return FLOOR_SHOPS[floor] ?? DEFAULT_SHOP;
}

function pickRandomGreeter(previous?: AnimalGreeter): AnimalGreeter {
  const candidates = ANIMAL_GREETERS.filter((animal) => animal.name !== previous?.name);
  return candidates[Math.floor(Math.random() * candidates.length)] ?? DEFAULT_GREETER;
}

function getNextTargetFloor(currentFloor: number, pendingFloors: number[], direction: Direction): number | null {
  if (pendingFloors.length === 0) return null;
  if (pendingFloors.includes(currentFloor)) return currentFloor;

  const above = pendingFloors.filter((floor) => floor > currentFloor).sort((a, b) => a - b);
  const below = pendingFloors.filter((floor) => floor < currentFloor).sort((a, b) => b - a);
  const nearestAbove = above[0];
  const nearestBelow = below[0];

  if (direction === 'up') {
    if (nearestAbove !== undefined) return nearestAbove;
    return nearestBelow ?? null;
  }

  if (direction === 'down') {
    if (nearestBelow !== undefined) return nearestBelow;
    return nearestAbove ?? null;
  }

  if (nearestAbove === undefined) return nearestBelow ?? null;
  if (nearestBelow === undefined) return nearestAbove;

  const upDelta = nearestAbove - currentFloor;
  const downDelta = currentFloor - nearestBelow;
  return upDelta <= downDelta ? nearestAbove : nearestBelow;
}

function App(): React.JSX.Element {
  const [showCredits, setShowCredits] = useState<boolean>(false);
  const [currentFloor, setCurrentFloor] = useState<number>(1);
  const [queue, setQueue] = useState<number[]>([]);
  const [doorState, setDoorState] = useState<DoorState>('closed');
  const [isDoorAnimating, setIsDoorAnimating] = useState<boolean>(false);
  const [isServingStop, setIsServingStop] = useState<boolean>(false);
  const [shouldAutoCloseAfterStop, setShouldAutoCloseAfterStop] = useState<boolean>(false);
  const [direction, setDirection] = useState<Direction>('stop');
  const [message, setMessage] = useState<string>('じゆうモード。すきな かいを おしてみよう。');
  const [greeter, setGreeter] = useState<AnimalGreeter>(() => pickRandomGreeter());

  const leftDoorX = useRef(new Animated.Value(0)).current;
  const rightDoorX = useRef(new Animated.Value(0)).current;
  const soundRefs = useRef<Partial<Record<SoundKey, Audio.Sound>>>({});
  const lastMoveDirectionRef = useRef<Direction>('up');
  const targetFloor = useMemo(() => {
    const serviceDirection = direction === 'stop' ? lastMoveDirectionRef.current : direction;
    return getNextTargetFloor(currentFloor, queue, serviceDirection);
  }, [currentFloor, queue, direction]);
  const currentShop = getFloorShop(currentFloor);

  useEffect(() => {
    LogBox.ignoreLogs([/Open debugger to view warnings/i, /Open Debugger to view warnings/i]);
  }, []);

  useEffect(() => {
    let mounted = true;

    const setupAudio = async (): Promise<void> => {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
      });

      const entries = Object.entries(SOUND_FILES) as [SoundKey, number][];
      await Promise.all(
        entries.map(async ([key, source]) => {
          const { sound } = await Audio.Sound.createAsync(source, {
            shouldPlay: false,
            volume: 0.7,
          });
          if (!mounted) {
            await sound.unloadAsync();
            return;
          }
          soundRefs.current[key] = sound;
        }),
      );
    };

    void setupAudio();
    return () => {
      mounted = false;
      const sounds = Object.values(soundRefs.current);
      void Promise.all(sounds.map((sound) => sound?.unloadAsync()));
      soundRefs.current = {};
    };
  }, []);

  useEffect(() => {
    const sounds = Object.values(soundRefs.current);
    void Promise.all(sounds.map((sound) => sound?.setVolumeAsync(0.7)));
  }, []);

  const playSound = (key: SoundKey): void => {
    const sound = soundRefs.current[key];
    if (!sound) return;

    void (async () => {
      try {
        await sound.stopAsync();
      } catch {
        // no-op
      }
      try {
        await sound.setPositionAsync(0);
        await sound.playAsync();
      } catch {
        // no-op
      }
    })();
  };

  const delay = (ms: number): Promise<void> =>
    new Promise((resolve) => {
      setTimeout(resolve, ms);
    });

  const openDoors = (callback?: () => void): void => {
    if (isDoorAnimating) return;
    setIsDoorAnimating(true);
    playSound('doorMove');
    Animated.parallel([
      Animated.timing(leftDoorX, {
        toValue: -DOOR_TRAVEL,
        duration: DOOR_ANIMATION_MS,
        useNativeDriver: true,
      }),
      Animated.timing(rightDoorX, {
        toValue: DOOR_TRAVEL,
        duration: DOOR_ANIMATION_MS,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setDoorState('open');
      setIsDoorAnimating(false);
      callback?.();
    });
  };

  const closeDoors = (callback?: () => void): void => {
    if (isDoorAnimating) return;
    setIsDoorAnimating(true);
    playSound('doorMove');
    Animated.parallel([
      Animated.timing(leftDoorX, {
        toValue: 0,
        duration: DOOR_ANIMATION_MS,
        useNativeDriver: true,
      }),
      Animated.timing(rightDoorX, {
        toValue: 0,
        duration: DOOR_ANIMATION_MS,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setDoorState('closed');
      setIsDoorAnimating(false);
      callback?.();
    });
  };

  const enqueueFloor = (floor: number): void => {
    if (floor === currentFloor) {
      if (doorState === 'closed' && !isDoorAnimating) {
        setGreeter((prev) => pickRandomGreeter(prev));
        playSound('doorOpenVoice');
        setTimeout(() => openDoors(), 180);
      }
      return;
    }

    if (queue.includes(floor)) return;
    setQueue((prev) => [...prev, floor]);
    setMessage(`${floor}かいを とうろくしたよ。`);
    playSound('signal');
  };

  const handleManualOpen = (): void => {
    if (isDoorAnimating || doorState === 'open') return;
    setGreeter((prev) => pickRandomGreeter(prev));
    playSound('doorOpenVoice');
    setTimeout(() => openDoors(), 180);
  };

  const handleManualClose = (): void => {
    if (isDoorAnimating || doorState === 'closed') return;
    setShouldAutoCloseAfterStop(false);
    playSound('doorCloseVoice');
    setTimeout(() => closeDoors(), 180);
  };

  useEffect(() => {
    if (isServingStop) return;
    if (isDoorAnimating) return;
    if (!targetFloor) {
      setDirection('stop');
      return;
    }

    if (currentFloor === targetFloor) {
      setIsServingStop(true);
      setQueue((prev) => prev.filter((floor) => floor !== targetFloor));
      setDirection('stop');
      setMessage(`${targetFloor}かいに とうちゃく。`);
      playSound('signal2');

      if (doorState === 'closed') {
        void (async () => {
          await delay(ARRIVAL_TO_OPEN_ANNOUNCE_MS);
          setGreeter((prev) => pickRandomGreeter(prev));
          playSound('doorOpenVoice');
          await delay(OPEN_ANNOUNCE_TO_DOOR_OPEN_MS);
          openDoors(() => {
            setTimeout(() => {
              setMessage('とびらが ひらきました。');
              setShouldAutoCloseAfterStop(true);
              setIsServingStop(false);
            }, 300);
          });
        })();
      } else {
        setTimeout(() => {
          setMessage('とびらが ひらきました。');
          setShouldAutoCloseAfterStop(true);
          setIsServingStop(false);
        }, 300);
      }
      return;
    }

    if (doorState === 'open') {
      setMessage('しゅっぱつするので とびらを しめます。');
      const moveDirection = currentFloor < targetFloor ? 'up' : 'down';
      const timer = setTimeout(() => {
        playSound('doorCloseVoice');
        closeDoors(() => {
          setTimeout(() => {
            playSound(moveDirection === 'up' ? 'upVoice' : 'downVoice');
          }, DEPARTURE_ANNOUNCE_DELAY_MS);
        });
      }, DOOR_DWELL_MS);
      return () => clearTimeout(timer);
    }

    const moveDirection = currentFloor < targetFloor ? 'up' : 'down';
    setDirection(moveDirection);
    lastMoveDirectionRef.current = moveDirection;
    playSound('moveMotor');

    const timer = setTimeout(() => {
      setCurrentFloor((prev) => prev + (moveDirection === 'up' ? 1 : -1));
    }, FLOOR_TRAVEL_MS);

    return () => clearTimeout(timer);
  }, [currentFloor, doorState, isDoorAnimating, isServingStop, targetFloor]);

  useEffect(() => {
    if (!shouldAutoCloseAfterStop) return;
    if (isDoorAnimating || isServingStop) return;
    if (doorState !== 'open') return;

    if (targetFloor !== null) {
      setShouldAutoCloseAfterStop(false);
      return;
    }

    const timer = setTimeout(() => {
      playSound('doorCloseVoice');
      closeDoors(() => {
        setShouldAutoCloseAfterStop(false);
      });
    }, DOOR_DWELL_MS);

    return () => clearTimeout(timer);
  }, [closeDoors, doorState, isDoorAnimating, isServingStop, shouldAutoCloseAfterStop, targetFloor]);

  const panelFloorButtons = useMemo(
    () =>
      FLOORS.map((floor) => (
        <Pressable
          key={floor}
          onPress={() => enqueueFloor(floor)}
          style={({ pressed }) => [
            styles.panelFloorButton,
            queue.includes(floor) && styles.panelFloorButtonQueued,
            pressed && styles.floorButtonPressed,
          ]}
        >
          <Text style={styles.panelFloorButtonText}>{floor}</Text>
        </Pressable>
      )),
    [currentFloor, queue],
  );

  const header = (
    <View style={styles.headerRow}>
      <Text style={styles.title}>こどもエレベーターたいけん</Text>
      <Pressable style={styles.headerButton} onPress={() => setShowCredits(true)}>
        <Text style={styles.headerButtonText}>クレジット</Text>
      </Pressable>
    </View>
  );

  if (showCredits) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>クレジット</Text>
          <Pressable style={styles.headerButton} onPress={() => setShowCredits(false)}>
            <Text style={styles.headerButtonText}>もどる</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.creditsContent}>
          <View style={styles.creditsCard}>
            <Text style={styles.creditsTitle}>音源</Text>
            <Text style={styles.creditsText}>効果音の一部は「ポケットサウンド」様の音源を使用しています。</Text>
            <Pressable onPress={() => void Linking.openURL('https://pocket-se.info/')}>
              <Text style={styles.creditsLink}>https://pocket-se.info/</Text>
            </Pressable>
          </View>

          <View style={styles.creditsCard}>
            <Text style={styles.creditsTitle}>利用技術</Text>
            <Text style={styles.creditsText}>React Native</Text>
            <Text style={styles.creditsText}>Expo</Text>
            <Text style={styles.creditsText}>react / react-native</Text>
            <Text style={styles.creditsText}>expo-av / expo-asset / expo-speech</Text>
            <Text style={styles.creditsText}>TypeScript</Text>
          </View>

          <View style={styles.creditsCard}>
            <Text style={styles.creditsTitle}>このアプリについて</Text>
            <Text style={styles.creditsText}>AmusingElevator</Text>
            <Text style={styles.creditsText}>こども向けエレベーターたいけんアプリ</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {header}
      <ScrollView contentContainerStyle={styles.playContent}>
        <View style={styles.characterBubble}>
          <Text style={styles.character}>🐣</Text>
          <Text style={styles.message}>{message}</Text>
        </View>

        <View style={styles.elevatorSection}>
          <View style={styles.elevatorMachine}>
            <View style={styles.machineTopDisplay}>
              <Text style={styles.machineTopText}>
                げんざい {currentFloor}かい {direction === 'up' ? '▲' : direction === 'down' ? '▼' : '■'}
              </Text>
            </View>

            <View style={styles.machineBody}>
              <View style={styles.elevatorFrame}>
                <View style={styles.elevatorLintel} />
                <View style={styles.car}>
                  <View style={styles.rearWall} />
                  <View style={[styles.innerHall, { backgroundColor: currentShop.color }]}>
                    <Text style={styles.innerFloorBadge}>{currentFloor}かい</Text>
                    {doorState === 'open' && (
                      <View style={[styles.greeterCard, { backgroundColor: greeter.bg }]}>
                        <Text style={styles.greeterEmoji}>{greeter.emoji}</Text>
                        <Text style={styles.greeterText}>{greeter.name}が おでむかえ！</Text>
                      </View>
                    )}
                  </View>
                  <Animated.View style={[styles.door, styles.leftDoor, { transform: [{ translateX: leftDoorX }] }]}>
                    <View style={[styles.doorHandle, styles.leftDoorHandle]} />
                    <View style={[styles.doorGloss, styles.leftDoorGloss]} />
                  </Animated.View>
                  <Animated.View style={[styles.door, styles.rightDoor, { transform: [{ translateX: rightDoorX }] }]}>
                    <View style={[styles.doorHandle, styles.rightDoorHandle]} />
                    <View style={[styles.doorGloss, styles.rightDoorGloss]} />
                  </Animated.View>
                </View>
              </View>

              <View style={styles.controlPanel}>
                <Text style={styles.panelDisplay}>そうさパネル</Text>
                <View style={styles.panelUtilityRow}>
                  <Pressable
                    onPress={handleManualOpen}
                    style={({ pressed }) => [styles.panelUtilityButton, pressed && styles.panelUtilityButtonPressed]}
                  >
                    <Text style={styles.panelUtilityButtonText}>開</Text>
                  </Pressable>
                  <Pressable
                    onPress={handleManualClose}
                    style={({ pressed }) => [styles.panelUtilityButton, pressed && styles.panelUtilityButtonPressed]}
                  >
                    <Text style={styles.panelUtilityButtonText}>閉</Text>
                  </Pressable>
                </View>
                <View style={styles.panelFloorGrid}>{panelFloorButtons}</View>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.bottomActions}>
          <Pressable
            style={({ pressed }) => [styles.secondaryButton, pressed && styles.secondaryButtonPressed]}
            onPress={() => {
              setQueue([]);
              setMessage('すきな かいを おしてみよう。');
            }}
          >
            <Text style={styles.secondaryButtonText}>いきさきを けす</Text>
          </Pressable>
        </View>
      </ScrollView>

      <View style={styles.adBanner}>
        <Text style={styles.adText}>広告エリア（AdMobバナー差し替え予定）</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFF9EC',
  },
  headerRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#4B3F2A',
  },
  headerButton: {
    backgroundColor: '#F2D79E',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  headerButtonText: {
    color: '#523F16',
    fontWeight: '700',
    fontSize: 12,
  },
  characterBubble: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 2,
    borderColor: '#F3E2B7',
  },
  character: {
    fontSize: 34,
  },
  message: {
    flex: 1,
    fontSize: 15,
    color: '#393223',
    lineHeight: 21,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#5BA7E9',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  secondaryButtonPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.97 }],
    backgroundColor: '#4A96D6',
  },
  secondaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 18,
  },
  playContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingBottom: 120,
    gap: 12,
  },
  elevatorSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  elevatorMachine: {
    width: '100%',
    maxWidth: 356,
    height: ELEVATOR_HEIGHT + 32,
    flexDirection: 'column',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#8A94A1',
    borderWidth: 3,
    borderColor: '#5F6875',
    borderRadius: 18,
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 8,
    gap: 8,
    overflow: 'hidden',
  },
  machineTopDisplay: {
    width: '100%',
    height: 46,
    borderRadius: 12,
    backgroundColor: '#232834',
    borderWidth: 2,
    borderColor: '#3F4758',
    alignItems: 'center',
    justifyContent: 'center',
  },
  machineTopText: {
    color: '#FFED76',
    fontSize: 22,
    fontWeight: '900',
  },
  machineBody: {
    width: '100%',
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'stretch',
    gap: 8,
  },
  elevatorFrame: {
    width: 200,
    height: '100%',
    borderRadius: 16,
    backgroundColor: '#7B8594',
    borderWidth: 2,
    borderColor: '#606978',
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 8,
  },
  elevatorLintel: {
    width: 186,
    height: 14,
    borderRadius: 4,
    backgroundColor: '#6F7785',
    marginBottom: 4,
  },
  car: {
    width: 186,
    flex: 1,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#777E88',
    borderWidth: 2,
    borderColor: '#59606C',
  },
  rearWall: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#A5AFBC',
  },
  innerHall: {
    position: 'absolute',
    top: 20,
    left: '50%',
    marginLeft: -52,
    width: 104,
    alignItems: 'center',
    backgroundColor: 'rgba(245, 250, 255, 0.85)',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderWidth: 1,
    borderColor: '#D3DEE8',
    overflow: 'hidden',
  },
  innerFloorBadge: {
    fontSize: 24,
    fontWeight: '900',
    color: '#2E3642',
  },
  greeterCard: {
    marginTop: 8,
    width: '100%',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D6DCE5',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  greeterEmoji: {
    fontSize: 38,
  },
  greeterText: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: '800',
    color: '#334258',
    textAlign: 'center',
  },
  door: {
    position: 'absolute',
    top: 0,
    width: '50%',
    height: '100%',
    backgroundColor: '#656D79',
    borderColor: '#505761',
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  leftDoor: {
    left: 0,
  },
  rightDoor: {
    right: 0,
  },
  doorHandle: {
    position: 'absolute',
    top: '50%',
    marginTop: -25,
    width: 6,
    height: 50,
    borderRadius: 3,
    backgroundColor: '#DDE4EB',
  },
  leftDoorHandle: {
    right: 10,
  },
  rightDoorHandle: {
    left: 10,
  },
  doorGloss: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 16,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  leftDoorGloss: {
    left: 12,
  },
  rightDoorGloss: {
    right: 12,
  },
  controlPanel: {
    width: 126,
    height: '100%',
    borderRadius: 12,
    backgroundColor: '#2F333C',
    borderWidth: 2,
    borderColor: '#596275',
    paddingHorizontal: 7,
    paddingVertical: 8,
    gap: 8,
  },
  panelDisplay: {
    height: 40,
    borderRadius: 8,
    backgroundColor: '#0F141C',
    color: '#B8D2EA',
    textAlign: 'center',
    textAlignVertical: 'center',
    fontSize: 18,
    fontWeight: '900',
    paddingTop: 6,
  },
  panelUtilityRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
  },
  panelUtilityButton: {
    flex: 1,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#8892A3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  panelUtilityButtonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.95 }],
    backgroundColor: '#748195',
  },
  panelUtilityButtonText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#172233',
  },
  panelFloorGrid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 8,
    columnGap: 6,
    justifyContent: 'space-between',
    alignContent: 'space-between',
  },
  panelFloorButton: {
    width: '47%',
    height: 50,
    borderRadius: 7,
    backgroundColor: '#D8DFEA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  panelFloorButtonQueued: {
    backgroundColor: '#AFC3E6',
  },
  floorButtonPressed: {
    opacity: 0.8,
  },
  panelFloorButtonText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#223248',
  },
  bottomActions: {
    marginBottom: 12,
  },
  creditsContent: {
    paddingHorizontal: 16,
    paddingBottom: 96,
    gap: 12,
  },
  creditsCard: {
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#F3E2B7',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 6,
  },
  creditsTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#3E341E',
  },
  creditsText: {
    fontSize: 14,
    color: '#393223',
    lineHeight: 20,
    fontWeight: '600',
  },
  creditsLink: {
    marginTop: 2,
    fontSize: 14,
    color: '#2C6FD2',
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  adBanner: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 56,
    backgroundColor: '#F2F2F2',
    borderTopWidth: 1,
    borderTopColor: '#D4D4D4',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  adText: {
    color: '#666666',
    fontSize: 13,
    fontWeight: '600',
  },
});

export default App;
