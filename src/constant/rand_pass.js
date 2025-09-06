function rand_pass() {
  return Math.random().toString(36).slice(2, 8)
}

export default rand_pass
