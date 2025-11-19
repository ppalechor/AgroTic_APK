import React, { useRef, useEffect, useState } from 'react';
import { View, ScrollView, Image, StyleSheet } from 'react-native';

export default function ImageCarousel({ images, size = 140, intervalMs = 3000 }) {
  const scrollRef = useRef(null);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      const next = (index + 1) % images.length;
      setIndex(next);
      scrollRef.current?.scrollTo({ x: next * size, animated: true });
    }, intervalMs);
    return () => clearInterval(id);
  }, [index, images.length, intervalMs, size]);

  return (
    <View style={[styles.wrap, { width: size, height: size, borderRadius: size / 2 }]}> 
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        style={{ width: size, height: size }}
      >
        {images.map((img, i) => (
          <Image key={i} source={img} style={{ width: size, height: size }} />
        ))}
      </ScrollView>
      <View style={styles.dots}>
        {images.map((_, i) => (
          <View key={i} style={[styles.dot, index === i && styles.dotActive]} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { overflow: 'hidden', borderWidth: 3, borderColor: '#16A34A' },
  dots: { position: 'absolute', bottom: 6, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center' },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#CBD5E1', marginHorizontal: 3 },
  dotActive: { backgroundColor: '#16A34A' },
});