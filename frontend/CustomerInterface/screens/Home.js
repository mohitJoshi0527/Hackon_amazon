import React, { useEffect, useState } from "react";
import { View, Text, FlatList, Button, StyleSheet } from "react-native";
import { EXPRESS_API } from "@env";
export default HomeScreen = () => {
  const [items, setItems] = useState([]);
  const [cart, setCart] = useState({});

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      const response = await fetch(`${EXPRESS_API}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setItems(data);
    } catch (error) {
      console.error("Error fetching items:", error.message);
    }
  };

  const addToCart = (item) => {
    setCart((prev) => {
      const existing = prev[item.itemId];
      return {
        ...prev,
        [item.itemId]: {
          item,
          quantity: existing ? existing.quantity + 1 : 1,
        },
      };
    });
  };

  const removeFromCart = (itemId) => {
    setCart((prev) => {
      const newCart = { ...prev };
      if (newCart[itemId].quantity > 1) {
        newCart[itemId].quantity -= 1;
      } else {
        delete newCart[itemId];
      }
      return newCart;
    });
  };

  const renderItem = ({ item }) => (
    <View style={styles.item}>
      <Text>
        {item.name} - ₹{item.price}
      </Text>
      <Button title="Add to Cart" onPress={() => addToCart(item)} />
    </View>
  );

  const renderCart = () => {
    const cartItems = Object.values(cart);
    const total = cartItems.reduce(
      (sum, entry) => sum + entry.item.price * entry.quantity,
      0
    );

    return (
      <View style={styles.cart}>
        <Text style={styles.cartTitle}>🛒 Cart</Text>
        {cartItems.length === 0 ? (
          <Text>Cart is empty</Text>
        ) : (
          cartItems.map(({ item, quantity }) => (
            <View key={item.itemId} style={styles.cartItem}>
              <Text>
                {item.name} x {quantity} = ₹{item.price * quantity}
              </Text>
              <Button
                title="Remove"
                onPress={() => removeFromCart(item.itemId)}
              />
            </View>
          ))
        )}
        <Text style={styles.total}>Total: ₹{total}</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>🛍️ Item List</Text>
      <FlatList
        data={items}
        keyExtractor={(item) => item.itemId.toString()}
        renderItem={renderItem}
      />
      {renderCart()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingTop: 50,
    flex: 1,
    backgroundColor: "#fff",
  },
  heading: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 10,
  },
  item: {
    marginBottom: 10,
    borderBottomWidth: 1,
    borderColor: "#ccc",
    paddingBottom: 10,
  },
  cart: {
    marginTop: 20,
    borderTopWidth: 1,
    borderColor: "#333",
    paddingTop: 10,
  },
  cartTitle: {
    fontSize: 20,
    fontWeight: "bold",
  },
  cartItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 5,
  },
  total: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: "bold",
  },
});
