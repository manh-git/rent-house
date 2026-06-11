import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { searchAddress, NominatimResult } from '@/utils/nominatim';
import { OSMMapView } from './OSMMapView';

interface AddressResult {
  display_name: string;
  lat: number;
  lng: number;
  ward: string;
}

interface AddressSearchProps {
  onSelect: (result: AddressResult) => void;
}

export function AddressSearch({ onSelect }: AddressSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<AddressResult | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleChangeText = useCallback((text: string) => {
    setQuery(text);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (text.length < 3) { setResults([]); return; }

    debounceRef.current = setTimeout(async () => {
      try {
        setLoading(true);
        const data = await searchAddress(text);
        setResults(data);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 600);
  }, []);

  const handleSelect = (item: NominatimResult) => {
    const ward =
      item.address?.quarter ||
      item.address?.suburb ||
      item.address?.city_district || '';

    const result: AddressResult = {
      display_name: item.display_name,
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
      ward,
    };

    setSelected(result);
    setQuery(item.display_name);
    setResults([]);
    onSelect(result);
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setSelected(null);
  };

  return (
    <View>
      {/* Input tìm kiếm */}
      <View style={styles.inputRow}>
        <Ionicons name="search-outline" size={16} color="#9CA3AF" />
        <TextInput
          style={styles.input}
          placeholder="Nhập địa chỉ phòng trọ..."
          placeholderTextColor="#9CA3AF"
          value={query}
          onChangeText={handleChangeText}
        />
        {loading && <ActivityIndicator size="small" color="#4F46E5" />}
        {query.length > 0 && !loading && (
          <TouchableOpacity onPress={handleClear}>
            <Ionicons name="close-circle" size={16} color="#9CA3AF" />
          </TouchableOpacity>
        )}
      </View>

      {/* Danh sách gợi ý */}
      {results.length > 0 && (
        <View style={styles.resultList}>
          {results.map((item) => (
            <TouchableOpacity
              key={item.place_id}
              style={styles.resultItem}
              onPress={() => handleSelect(item)}
            >
              <Ionicons name="location-outline" size={16} color="#4F46E5" />
              <Text style={styles.resultText} numberOfLines={2}>
                {item.display_name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Bản đồ xác nhận */}
      {selected && (
        <View style={styles.mapBox}>
          <OSMMapView lat={selected.lat} lng={selected.lng} height={200} />
          <View style={styles.coordRow}>
            <Ionicons name="checkmark-circle" size={14} color="#10B981" />
            <Text style={styles.coordText}>
              {selected.lat.toFixed(5)}, {selected.lng.toFixed(5)}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  inputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#FAFAFA',
  },
  input: { flex: 1, fontSize: 14, color: '#111', padding: 0 },

  resultList: {
    borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10,
    backgroundColor: '#fff', marginTop: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 6, elevation: 4,
  },
  resultItem: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    padding: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  resultText: { flex: 1, fontSize: 13, color: '#374151', lineHeight: 18 },

  mapBox: { marginTop: 12, borderRadius: 12, overflow: 'hidden' },
  coordRow: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    padding: 8, backgroundColor: '#F0FDF4',
  },
  coordText: { fontSize: 12, color: '#10B981' },
});