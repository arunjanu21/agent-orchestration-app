// Simulated database for demo purposes
// In production, replace with actual DB calls / API calls

export const mockDatabase = {
  orders: {
    'ORD-2024-001': {
      order_id: 'ORD-2024-001',
      product: 'Laptop Dell XPS 15',
      status: 'In Transit',
      placed_on: '2024-01-10',
      expected_delivery: '2024-01-14',
      tracking_number: 'TRK-FDX-789456',
      courier: 'FedEx',
      amount: 75000,
      customer_email: 'arun@example.com'
    },
    'ORD-2024-002': {
      order_id: 'ORD-2024-002',
      product: 'Wireless Mouse',
      status: 'Delivered',
      placed_on: '2024-01-05',
      expected_delivery: '2024-01-08',
      tracking_number: 'TRK-BLU-123789',
      courier: 'BlueDart',
      amount: 2500,
      customer_email: 'arun@example.com'
    }
  },
  discounts: {
    standard: [
      { code: 'LOYAL10', discount: '10% off', valid_till: '2024-02-28', min_order: 5000 },
      { code: 'NEXT15', discount: '₹1500 off', valid_till: '2024-02-28', min_order: 10000 },
      { code: 'WELCOME5', discount: '5% off', valid_till: '2024-03-31', min_order: 1000 }
    ]
  },
  products: {
    laptops: [
      { id: 1, name: 'Dell XPS 15', price: 75000, stock: 5, rating: 4.5 },
      { id: 2, name: 'MacBook Air M2', price: 99000, stock: 3, rating: 4.8 },
      { id: 3, name: 'Lenovo ThinkPad', price: 65000, stock: 8, rating: 4.3 }
    ]
  },
  refunds: {
    eligible_window_days: 7,
    policy: 'Items can be returned within 7 days of delivery in original condition'
  }
};

export function executeToolCall(toolName: string, input: Record<string, any>): string {
  switch (toolName) {

    case 'get_order_status': {
      const order = Object.values(mockDatabase.orders).find(
        o => o.order_id === input.order_id
      );
      return JSON.stringify(order ?? { error: 'Order not found' });
    }

    case 'get_orders_by_customer': {
      const orders = Object.values(mockDatabase.orders).filter(
        o => o.customer_email === input.customer_email || !input.customer_email
      );
      return JSON.stringify({ orders, total: orders.length });
    }

    case 'get_available_discounts': {
      return JSON.stringify({
        customer_email: input.customer_email,
        available_codes: mockDatabase.discounts.standard
      });
    }

    case 'check_refund_eligibility': {
      const order = Object.values(mockDatabase.orders).find(
        o => o.order_id === input.order_id
      );
      if (!order) return JSON.stringify({ eligible: false, reason: 'Order not found' });
      return JSON.stringify({
        eligible: true,
        order_id: input.order_id,
        policy: mockDatabase.refunds.policy,
        refund_amount: order.amount
      });
    }

    case 'get_products_by_category': {
      const category = input.category?.toLowerCase();
      const products = (mockDatabase.products as any)[category] ?? [];
      return JSON.stringify({ category, products });
    }

    default:
      return JSON.stringify({ error: `Tool ${toolName} not found` });
  }
}
