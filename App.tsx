/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * Generated with the TypeScript template
 * https://github.com/react-native-community/react-native-template-typescript
 *
 * @format
 */

import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  NativeModules,
  Button,
  NativeEventEmitter,
  PermissionsAndroid,
} from 'react-native';

import {calculateEditDistance, wordErrorRate} from 'word-error-rate';
import {findBestMatch} from 'string-similarity';
// import stringSimilarity from  'string-similarity';

import VoskInterface from './VoskModule';

const requestMicrophonePermission = async (setLogs: Function) => {
  const SUCCESS_MSG = 'Permission RECORD_AUDIO granted.';
  const DENIED_MSG = 'Permission RECORD_AUDIO denied.';
  try {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
    );

    if (granted === PermissionsAndroid.RESULTS.GRANTED) {
      setLogs(SUCCESS_MSG);
    } else {
      setLogs(DENIED_MSG);
    }
  } catch (err) {
    // console.error(err);
    setLogs(err);
  }
};

const requestReadExternalPermission = async (setLogs: Function) => {
  const SUCCESS_MSG = 'Permission READ_EXTERNAL_STORAGE granted.';
  const DENIED_MSG = 'Permission READ_EXTERNAL_STORAGE denied.';

  try {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
    );

    if (granted === PermissionsAndroid.RESULTS.GRANTED) {
      setLogs(SUCCESS_MSG);
    } else {
      setLogs(DENIED_MSG);
    }
  } catch (err) {
    // console.error(err);
    setLogs(err);
  }
};

const getLogTime = () => new Date().toLocaleTimeString();

const calculateWER = (
  expected: string[],
  predicted: string[],
  setLogs: Function,
) => {
  const predictedLen = predicted.length;
  const expectedLen = expected.length;
  if (predictedLen !== expectedLen) {
    const mismatchLenErrTxt = `Mismatch in predicted phrases (${predictedLen}) and true phrases (${expectedLen})\nPlease Restart App.`;

    setLogs(mismatchLenErrTxt);

    console.error(mismatchLenErrTxt);
  }
  let wer = 0;
  for (let idx = 0; idx < expectedLen; idx++) {
    // EditDistance is between words and not character
    wer += wordErrorRate(predicted[idx], expected[idx]);
  }

  wer /= expectedLen;

  // setLogs(`WER: ${wer}`);
  return wer;
};

const phrases = [
  'rename selected views',
  'delete selected views',
  'rename selected tasks',
  'delete selected tasks',
  'rename task',
  'copy task',
  'delete task',
  'add task',
  'settings',
  'controls on',
  'controls off',
  'page controls',
  'document controls',
  'view controls',
  'media controls',
  'camera controls',
  'video controls',
  'page navigation',
  'view layout',
  'single click',
  'double click',
  'drag start',
  'drag stop',
  'go to page',
  'previous page',
  'next page',
  'page',
  'scroll down',
  'scroll up',
  'scroll right',
  'scroll left',
  'pinch open',
  'pinch close',
  'rotate image',
  'scroll to cursor',
  'freeze page',
  'unfreeze page',
  'show guides',
  'hide guides',
  'page left',
  'page right',
  'page up',
  'page down',
  'zoom in',
  'zoom out',
  'zoom level',
  'zoom level one',
  'zoom level two',
  'zoom level three',
  'zoom level four',
  'zoom level five',
  'magnify on',
  'magnify off',
  'copy views',
  'rename view',
  'save view',
  'update view',
  'reload view',
  'add view',
  'delete view',
  'flash on',
  'flash off',
  'take photo',
  'start recording',
  'pause recording',
  'stop recording',
  'resume recording',
  'exposure level',
  'exposure level minus two',
  'exposure level minus one',
  'exposure level zero',
  'exposure level plus one',
  'exposure level plus two',
  'pause video',
  'play video',
  'metadata off',
  'metadata on',
  'playback controls',
  'rewind video',
  'advance video',
  'audio off',
  'audio on',
  'layout controls',
  'arrange views',
  'general controls',
  'gallery on',
  'gallery off',
  'tag controls',
  'expand view',
  'shrink view',
  'previous view',
  'next view',
  'view',
  'remote mentor',
  'stop camera',
  'stop skype',
  'start camera',
  'save layout',
  'tile view',
  'full screen',
  'show selected views',
  'show views',
  'hide views',
  'create new tag',
  'remove all tags',
  'show tagged views',
  'hide tagged views',
  'add selected tags',
  'show selected tag views',
  'multitouch',
  'list views',
  'manage tags',
  'view tags',
  'add selected views',
  'list tags',
  'create tag',
  'tag description',
  'tag description',
  'move left',
  'move right',
  'move down',
  'move up',
  'increase width',
  'decrease width',
  'increase height',
  'decrease height',
  'scan code',
  'rename',
  'cancel',
  'continue',
  'create',
  'enter',
  'manage license',
  'load page',
  'view location',
  'new view name',
  'display name',
  'meeting url or id',
  'select next',
  'select previous',
  'reposition up',
  'reposition down',
  'previous step',
  'next step',
  'edit workflow',
  'run workflow',
  'delete tag',
  'cancel',
];

const App = () => {
  const separatorText = '-----------------------------------------------------';
  const [logs, _setLogs] = useState('');
  const [phraseIdx, setPhraseIdx] = useState(-1);

  const scrollViewRef = useRef<ScrollView>();
  const logsRef = useRef(logs);
  const preds = useRef<string[]>([]);
  const errorCorrectedPreds = useRef<string[]>([]);

  const increment = () => {
    setPhraseIdx(phraseIdx + 1);
  };

  const setLogs = (data: string, addNewLine = true) => {
    if (addNewLine) {
      logsRef.current = `${logsRef.current}\n${getLogTime()}: ${data}`;
    } else {
      logsRef.current = `${logsRef.current}${data}`;
    }

    _setLogs(`${logsRef.current}`);
  };

  const changePhrase = useCallback(() => {
    setPhraseIdx(phraseIdx + 1);
    if (phraseIdx + 1 >= phrases.length) {
      setLogs('Done transcribing all phrases');
      setLogs(
        `Predicted Phrases\n${preds.current.join('\n')}\n${separatorText}`,
      );
      setLogs(
        `Error Corrected Phrases\n${errorCorrectedPreds.current.join(
          '\n',
        )}\n${separatorText}`,
      );
      setLogs('Calculating WER...');
      const predWer = calculateWER(preds.current, phrases, setLogs);
      setLogs(`WER: ${predWer}`);

      const correctedWER = calculateWER(
        errorCorrectedPreds.current,
        phrases,
        setLogs,
      );
      setLogs(`Corrected WER: ${correctedWER}`);
      return;
    }
    const nextPhrase = phrases[phraseIdx + 1];
    setLogs(`Speak: ${nextPhrase}`);
  }, [phraseIdx]);

  const doPhraseErrorCorrection = (predWord: string) => {
    const res = findBestMatch(predWord, phrases);
    const bestMatch = res.bestMatch.target;
    setLogs(`Corrected: ${bestMatch}\n${separatorText}`);
    errorCorrectedPreds.current.push(bestMatch);
  };

  useEffect(() => {
    const init = async () => {
      try {
        await requestReadExternalPermission(setLogs);
        await requestMicrophonePermission(setLogs);

        await VoskInterface.initialize();
        // changePhrase();
        // increment();
      } catch (error) {
        console.error(error);
        // setLogs(error);
      }
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Native Event handlers
  useEffect(() => {
    const eventEmitter = new NativeEventEmitter(NativeModules.VoskModule);

    const speechReadySubscription = eventEmitter.addListener(
      'onSpeechReady',
      () => {
        setLogs('Ready to Record.');
      },
    );

    const speechErrorSubscription = eventEmitter.addListener(
      'onSpeechError',
      event => {
        // error message is in 'message' key
        setLogs(event.message);
      },
    );

    const speechFinalResultSubscription = eventEmitter.addListener(
      'onSpeechFinalResults',
      event => {
        setLogs(`Predicted: ${event.value}`);
        preds.current.push(event.value[0]);
        doPhraseErrorCorrection(event.value[0]);
        // changePhrase();
      },
    );

    //  eventEmitter.addListener("onSpeechPartialResults", (event) => {
    //   console.log("onSpeechPartialResults");
    //   console.log(event);
    //  })

    eventEmitter.addListener('onSpeechEnd', event => {
      // console.log('onSpeechEnd');
      // console.log(event);
      // setLogs("Recording ended.")
    });

    const speechStartSubscription = eventEmitter.addListener(
      'onSpeechStart',
      () => {
        // console.log('onSpeechStart');
        // console.log(event);
        setLogs('Recording...');
      },
    );

    const speechStopSubscription = eventEmitter.addListener(
      'onSpeechStop',
      () => {
        // console.log('onSpeechStart');
        // console.log(event);
        setLogs('.stopped', false);
      },
    );

    // eventEmitter.addListener("TranscribeFile", event => {
    //   console.log(JSON.stringify(event))
    // })
    return () => {
      // eventEmitter.removeAllListeners('onSpeechStop');
      speechReadySubscription.remove();
      speechErrorSubscription.remove();
      speechFinalResultSubscription.remove();
      speechStopSubscription.remove();
      speechStartSubscription.remove();
    };
  }, [changePhrase]);

  return (
    <SafeAreaView>
      <StatusBar />
      <View style={styles.container}>
        <View style={[styles.sectionContainer, {borderWidth: 1, flex: 3}]}>
          <ScrollView
            contentInsetAdjustmentBehavior="automatic"
            ref={scrollViewRef}
            onContentSizeChange={(_contentWidth, _contentHeight) => {
              scrollViewRef.current?.scrollToEnd({animated: true});
            }}>
            <Text selectable>{logs}</Text>
          </ScrollView>
        </View>

        <View style={styles.sectionContainer}>
          <View style={styles.btnContainer}>
            <Button
              title="Start Recording"
              color="#841584"
              onPress={() => VoskInterface.startListening()}
            />
          </View>
          <View style={styles.btnContainer}>
            <Button
              title="Stop Recording"
              color="#451584"
              onPress={() => VoskInterface.stopListening()}
            />
          </View>

          {/* <View style={styles.btnContainer}>
            <Button
              title="Next Phrase"
              color="#451584"
              onPress={() => changePhrase()}
              disabled={phraseIdx >= phrases.length}
            />
          </View> */}
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    display: 'flex',
    padding: 20,
    height: '100%',
    flexDirection: 'column',
  },
  sectionContainer: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: 10,
    padding: 5,
  },
  btnContainer: {
    display: 'flex',
    flexDirection: 'column',
    // backgroundColor: 'aqua',
    alignSelf: 'stretch',
    justifyContent: 'space-around',
    margin: 5,
  },
});

export default App;
