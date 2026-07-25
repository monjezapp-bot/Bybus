import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { supabase } from "../lib/supabaseClient";
import { COLORS } from "../theme";

export default function AuthScreen() {
  const [mode, setMode] = useState("login"); // "login" | "signup"
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin() {
    setError("");
    if (!email || !password) {
      setError("من فضلك أدخل البريد الإلكتروني وكلمة المرور");
      return;
    }
    setLoading(true);
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) throw new Error("فشل تسجيل الدخول: تحقق من البريد وكلمة المرور");
      // مفيش حاجة تانية مطلوبة - المتابعة بتتم تلقائياً عن طريق مراقبة الجلسة في App.js
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSignup() {
    setError("");
    if (!fullName || !email || !password) {
      setError("الاسم والبريد الإلكتروني وكلمة المرور مطلوبين");
      return;
    }
    if (password.length < 6) {
      setError("كلمة المرور لازم تكون 6 حروف على الأقل");
      return;
    }
    setLoading(true);
    try {
      const { error: signupError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            signup_role: "parent", // ده اللي بيخلي قاعدة البيانات تعرف تعمل حساب ولي أمر تلقائي
            full_name: fullName,
            phone: phone || null,
          },
        },
      });
      if (signupError) throw new Error(signupError.message || "فشل إنشاء الحساب");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.logoWrap}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoEmoji}>🚌</Text>
          </View>
          <Text style={styles.title}>Bybus</Text>
          <Text style={styles.subtitle}>تطبيق ولي الأمر</Text>
        </View>

        <View style={styles.tabsRow}>
          <TouchableOpacity
            style={[styles.tab, mode === "login" && styles.tabActive]}
            onPress={() => {
              setMode("login");
              setError("");
            }}
          >
            <Text style={[styles.tabText, mode === "login" && styles.tabTextActive]}>تسجيل الدخول</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, mode === "signup" && styles.tabActive]}
            onPress={() => {
              setMode("signup");
              setError("");
            }}
          >
            <Text style={[styles.tabText, mode === "signup" && styles.tabTextActive]}>حساب جديد</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {mode === "signup" && (
            <>
              <Text style={styles.label}>الاسم الكامل</Text>
              <TextInput style={styles.input} value={fullName} onChangeText={setFullName} placeholder="اكتب اسمك" textAlign="right" />

              <Text style={styles.label}>رقم التليفون</Text>
              <TextInput
                style={[styles.input, styles.ltrInput]}
                value={phone}
                onChangeText={setPhone}
                placeholder="01xxxxxxxxx"
                keyboardType="phone-pad"
                textAlign="left"
              />
            </>
          )}

          <Text style={styles.label}>البريد الإلكتروني</Text>
          <TextInput
            style={[styles.input, styles.ltrInput]}
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            autoCapitalize="none"
            keyboardType="email-address"
            textAlign="left"
          />

          <Text style={styles.label}>كلمة المرور</Text>
          <TextInput
            style={[styles.input, styles.ltrInput]}
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            secureTextEntry
            textAlign="left"
          />

          <TouchableOpacity
            style={styles.submitButton}
            onPress={mode === "login" ? handleLogin : handleSignup}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>{mode === "login" ? "تسجيل الدخول" : "إنشاء الحساب"}</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: "#F9FAFB" },
  container: { flexGrow: 1, padding: 20, justifyContent: "center" },
  logoWrap: { alignItems: "center", marginBottom: 28 },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: "#EAF6FC",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  logoEmoji: { fontSize: 38 },
  title: { fontSize: 24, fontWeight: "800", color: "#1F2937" },
  subtitle: { fontSize: 14, color: "#9CA3AF", marginTop: 4 },
  tabsRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 14,
    alignItems: "center",
    backgroundColor: "#F3F4F6",
  },
  tabActive: { backgroundColor: COLORS.sky },
  tabText: { fontSize: 13, fontWeight: "700", color: "#6B7280" },
  tabTextActive: { color: "#fff" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 1,
  },
  errorBox: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FEE2E2",
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    marginBottom: 14,
  },
  errorText: { color: "#DC2626", fontSize: 12, textAlign: "right" },
  label: { fontSize: 12, color: "#6B7280", marginBottom: 6, textAlign: "right", fontWeight: "600" },
  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    marginBottom: 14,
    color: "#1F2937",
  },
  ltrInput: { writingDirection: "ltr" },
  submitButton: {
    backgroundColor: COLORS.orange,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 4,
  },
  submitButtonText: { color: "#fff", fontWeight: "800", fontSize: 15 },
});
