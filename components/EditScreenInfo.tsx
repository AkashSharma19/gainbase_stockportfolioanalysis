import React from 'react';
import { StyleSheet } from 'react-native';

import { ExternalLink } from './ExternalLink';
import { View } from './Themed';
import { ThemedText } from './ThemedText';

import Colors from '@/constants/Colors';

export default function EditScreenInfo({ path }: { path: string }) {
  return (
    <View>
      <View style={styles.getStartedContainer}>
        <ThemedText
          style={styles.getStartedText}
        >
          Open up the code for this screen:
        </ThemedText>

        <View
          style={[styles.codeHighlightContainer, styles.homeScreenFilename]}
        >
          <ThemedText style={{ fontFamily: 'SpaceMono' }}>{path}</ThemedText>
        </View>

        <ThemedText
          style={styles.getStartedText}
        >
          Change any of the text, save the file, and your app will automatically
          update.
        </ThemedText>
      </View>

      <View style={styles.helpContainer}>
        <ExternalLink
          style={styles.helpLink}
          href="https://docs.expo.io/get-started/create-a-new-app/#opening-the-app-on-your-phonetablet"
        >
          <ThemedText style={styles.helpLinkText}>
            Tap here if your app doesn't automatically update after making
            changes
          </ThemedText>
        </ExternalLink>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  getStartedContainer: {
    alignItems: 'center',
    marginHorizontal: 50,
  },
  homeScreenFilename: {
    marginVertical: 7,
  },
  codeHighlightContainer: {
    borderRadius: 3,
    paddingHorizontal: 4,
  },
  getStartedText: {
    fontSize: 17,
    lineHeight: 24,
    textAlign: 'center',
  },
  helpContainer: {
    marginTop: 15,
    marginHorizontal: 20,
    alignItems: 'center',
  },
  helpLink: {
    paddingVertical: 15,
  },
  helpLinkText: {
    textAlign: 'center',
  },
});
