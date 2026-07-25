import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { supabase } from "../lib/supabaseClient";
import { COLORS } from "../theme";

function todayStr() {
  return new Date().toLocaleDateString("en-CA");
}

// بيحدد حالة الطفل اللحظية بناءً على رحلتي النهاردة (ذهاب وعودة)
function deriveStatus(morning, evening) {
  if (evening?.trip_students_status === "dropped_off") {
    return { label: "وصل المنزل", color: COLORS.mint, emoji: "🏠" };
  }
  if (evening?.trip_students_status === "boarded") {
    return { label: "في الباص - في الطريق للمنزل", color: COLORS.sky, emoji: "🚌" };
  }
  if (evening?.trip_students_status === "absent") {
    return { label: "غائب اليوم", color: COLORS.textMuted, emoji: "➖" };
  }
  if (morning?.trip_students_status === "dropped_off") {
    return { label: "في المدرسة", color: COLORS.sun, emoji: "🏫" };
  }
  if (morning?.trip_students_status === "boarded") {
    return { label: "في الباص - في الطريق للمدرسة", color: COLORS.sky, emoji: "🚌" };
  }
  if (morning?.trip_students_status === "absent") {
    return { label: "غائب اليوم", color: COLORS.textMuted, emoji: "➖" };
  }
  return { label: "في المنزل", color: COLORS.textMuted, emoji: "🏠" };
}

function ChildCard({ student }) {
  const status = deriveStatus(student._morning, student._evening);
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>{student.full_name?.trim().slice(0, 1) || "؟"}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.childName}>{student.full_name}</Text>
          <Text style={styles.childMeta}>
            {student.schools?.name || "بدون مدرسة"}
            {student.grade ? ` · ${student.grade}` : ""}
          </Text>
        </View>
      </View>

      <View style={[styles.statusPill, { backgroundColor: status.color + "20" }]}>
        <Text style={styles.statusEmoji}>{status.emoji}</Text>
        <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
      </View>

      {student._bus ? (
        <View style={styles.busInfoRow}>
          <Text style={styles.busInfoText}>
            🚌 {student._bus.bus_code} · المشرفة: {student._bus.supervisor_name}
          </Text>
        </View>
      ) : (
        <Text style={styles.noBusText}>لسه متحددش باص للطفل ده</Text>
      )}
    </View>
  );
}

export default function HomeScreen({ profile, onSignOut }) {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadData = useCallback(
    async (isRefresh = false) => {
      isRefresh ? setRefreshing(true) : setLoading(true);
      setError("");
      try {
        const { data: studentsData, error: studentsError } = await supabase
          .from("students")
          .select("id, full_name, grade, bus_id, schools(name)")
          .eq("parent_id", profile.id)
          .eq("is_active", true);
        if (studentsError) throw studentsError;

        const today = todayStr();
        const studentIds = (studentsData || []).map((s) => s.id);

        let tripStudentsData = [];
        if (studentIds.length > 0) {
          const { data, error: tsError } = await supabase
            .from("trip_students")
            .select("student_id, status, trips!inner(trip_type, trip_date)")
            .in("student_id", studentIds)
            .eq("trips.trip_date", today);
          if (tsError) throw tsError;
          tripStudentsData = data || [];
        }

        const busIds = [...new Set((studentsData || []).map((s) => s.bus_id).filter(Boolean))];
        let busTrustData = [];
        if (busIds.length > 0) {
          const { data, error: busError } = await supabase.from("bus_trust_info").select("bus_id, bus_code, supervisor_name").in("bus_id", busIds);
          if (busError) throw busError;
          busTrustData = data || [];
        }

        const enriched = (studentsData || []).map((s) => {
          const morning = tripStudentsData.find((t) => t.student_id === s.id && t.trips.trip_type === "morning");
          const evening = tripStudentsData.find((t) => t.student_id === s.id && t.trips.trip_type === "evening");
          const bus = busTrustData.find((b) => b.bus_id === s.bus_id);
          return {
            ...s,
            _morning: morning ? { trip_students_status: morning.status } : null,
            _evening: evening ? { trip_students_status: evening.status } : null,
            _bus: bus || null,
          };
        });

        setStudents(enriched);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [profile.id]
  );

  useEffect(() => {
    loadData();

    const channel = supabase
      .channel("parent-home")
      .on("postgres_changes", { event: "*", schema: "public", table: "trip_students" }, () => loadData(true))
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadData]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.sky} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadData(true)} />}
    >
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.greeting}>أهلاً {profile.full_name?.split(" ")[0] || ""} 👋</Text>
          <Text style={styles.dateText}>
            {new Date().toLocaleDateString("ar-EG", { weekday: "long", day: "numeric", month: "long" })}
          </Text>
        </View>
        <TouchableOpacity onPress={onSignOut} style={styles.signOutButton}>
          <Text style={styles.signOutText}>خروج</Text>
        </TouchableOpacity>
      </View>

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {students.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>👶</Text>
          <Text style={styles.emptyText}>لسه مفيش أبناء مسجّلين على حسابك</Text>
          <Text style={styles.emptySubtext}>تواصل مع الدعم الفني أو المدرسة عشان تسجيل بيانات طفلك</Text>
        </View>
      ) : (
        students.map((s) => <ChildCard key={s.id} student={s} />)
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.bg },
  container: { padding: 20, paddingBottom: 40 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.bg },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  greeting: { fontSize: 20, fontWeight: "800", color: COLORS.text },
  dateText: { fontSize: 13, color: COLORS.textMuted, marginTop: 2 },
  signOutButton: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, backgroundColor: "#F3F4F6" },
  signOutText: { fontSize: 12, color: "#6B7280", fontWeight: "700" },
  errorBox: { backgroundColor: "#FEF2F2", borderColor: "#FEE2E2", borderWidth: 1, borderRadius: 12, padding: 10, marginBottom: 14 },
  errorText: { color: "#DC2626", fontSize: 12, textAlign: "right" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 1,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.mint,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#fff", fontWeight: "800", fontSize: 16 },
  childName: { fontSize: 15, fontWeight: "700", color: COLORS.text, textAlign: "right" },
  childMeta: { fontSize: 12, color: COLORS.textMuted, marginTop: 2, textAlign: "right" },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 10,
  },
  statusEmoji: { fontSize: 14 },
  statusText: { fontSize: 12, fontWeight: "700" },
  busInfoRow: { borderTopWidth: 1, borderTopColor: "#F3F4F6", paddingTop: 10 },
  busInfoText: { fontSize: 12, color: "#6B7280", textAlign: "right" },
  noBusText: { fontSize: 12, color: COLORS.textMuted, textAlign: "right", borderTopWidth: 1, borderTopColor: "#F3F4F6", paddingTop: 10 },
  emptyState: { alignItems: "center", paddingVertical: 60 },
  emptyEmoji: { fontSize: 40, marginBottom: 12 },
  emptyText: { fontSize: 15, fontWeight: "700", color: COLORS.text, textAlign: "center" },
  emptySubtext: { fontSize: 12, color: COLORS.textMuted, marginTop: 6, textAlign: "center", paddingHorizontal: 30 },
});
