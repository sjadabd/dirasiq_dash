export function calculateBill({ salary, payment, discount }) {
  let salaryNumber = Number(salary) ? Number(salary) : 0;
  let paymentNumber = Number(payment) ? Number(payment) : 0;
  let discountNumber = Number(discount) ? Number(discount) : 0;

  return salaryNumber - (paymentNumber + discountNumber);
}
