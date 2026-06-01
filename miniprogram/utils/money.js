function yuan(value) {
  return (Number(value || 0) / 100).toFixed(2);
}

module.exports = { yuan };

