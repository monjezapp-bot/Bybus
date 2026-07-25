import React, { useState, useEffect } from "react";
import { View, ActivityIndicator, StyleSheet, StatusBar } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "./src/lib/supabaseClient";
import { COLORS } from "./src/theme";
import AuthScreen from "./src/screens/AuthScreen";
import HomeScreen from "./src/screens/HomeScreen";

export default function App() {
  const [session, setSession] = useState(undefined); // undefined = لسه بنتحقق
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    async function loadProfileForSession(currentSession) {
      if (!currentSession) {
        setSession(null);
        setProfile(null);
        return;
      }
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, role, phone, email")
        .eq("id", currentSession.user.id)
        .single();

      if (error || !data || data.role !== "parent") {
        // لو الحساب مش ولي أمر (أو لسه صف الـ profile متعملش)، منسيبوش يدخل
        await supabase.auth.signOut();
        setSession(null);
        setProfile(null);
        return;
      }
      setProfile(data);
      setSession(currentSession);
    }

    supabase.auth.getSession().then(({ data }) => loadProfileForSession(data.session));

    const { data: listener } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      loadProfileForSession(currentSession);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  if (session === undefined) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.sky} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />
      <SafeAreaView style={styles.flex} edges={["top", "bottom"]}>
        {session && profile ? (
          <HomeScreen profile={profile} onSignOut={() => supabase.auth.signOut()} />
        ) : (
          <AuthScreen />
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: "#F9FAFB" },
  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#F9FAFB" },
});
