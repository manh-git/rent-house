import { View, StyleSheet } from "react-native";
import { Slot } from "expo-router";
import { AppHeader } from "@/components/common/Header";
import { AppFooter } from "@/components/common/Footer";

export default function MainLayout(){
    return (
        <View style={styles.container}>
            <AppHeader/>
            <View style={styles.content}>
                <Slot/>
            </View>
            <AppFooter/>

        </View>
    )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
});