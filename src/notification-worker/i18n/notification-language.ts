export const NotificationText = {
  en: {
    LOW_STOCK_TITLE: 'Low Stock Alert',
    LOW_STOCK_BODY: (name: string, stock: number, minStock: number) =>
      `Your stock ${name} (${stock}) is below minimum (${minStock})`,
    LOW_STOCK_BODY_MULTIPLE: (count: number, itemList: string) =>
      `${count} products need restocking: ${itemList}`,
  },
  mm: {
    LOW_STOCK_TITLE: 'ကုန်ပစ္စည်း နည်းနေပါသည်',
    LOW_STOCK_BODY: (name: string, stock: number, minStock: number) =>
      `${name} ကုန်ပစ္စည်း (${stock}) သည် minimum (${minStock}) ထက် နည်းနေပါသည်`,
    LOW_STOCK_BODY_MULTIPLE: (count: number, itemList: string) =>
      `ကုန်ပစ္စည်း ${count} မျိုး ဖြည့်သွင်းရန် လိုအပ်ပါသည် \n ${itemList}`,
  },
};
