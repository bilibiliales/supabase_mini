<template>
  <div id="app">
    <el-container>
      <el-header>
        <div class="header-content">
          <h1>Supabase Mini App</h1>
          <div v-if="user" class="user-info">
            <el-menu mode="horizontal" :default-active="activeMenu" router class="nav-menu">
              <el-menu-item index="/profile">个人资料</el-menu-item>
              <el-menu-item v-if="isAdmin" index="/admin">用户管理</el-menu-item>
            </el-menu>
            <span class="username">{{ displayUsername }}</span>
            <el-button type="primary" @click="handleLogout" size="small">登出</el-button>
          </div>
        </div>
      </el-header>
      <el-main>
        <router-view />
      </el-main>
    </el-container>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { supabase } from './lib/supabase'
import { ElMessage } from 'element-plus'

const router = useRouter()
const route = useRoute()
const user = ref(null)
const nickname = ref('')
const isAdmin = ref(false)

const activeMenu = computed(() => route.path)

const displayUsername = computed(() => {
  if (nickname.value) return nickname.value
  if (user.value?.email) {
    // 从邮箱提取用户名：xxx@zdjl.com -> xxx
    return user.value.email.replace('@zdjl.com', '')
  }
  return ''
})

// 加载用户资料函数
const loadUserProfile = async (userId) => {
  const { data } = await supabase
    .from('profiles')
    .select('nickname, role')
    .eq('id', userId)
    .single()

  if (data) {
    if (data.nickname) {
      nickname.value = data.nickname
    }
    isAdmin.value = data.role === 'admin'
  }
}

onMounted(async () => {
  const { data: { session } } = await supabase.auth.getSession()
  user.value = session?.user || null

  // 尝试从 profiles 表获取昵称和角色
  if (user.value) {
    await loadUserProfile(user.value.id)
  }

  // 监听认证状态变化
  const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
    user.value = session?.user || null
    
    if (session?.user) {
      await loadUserProfile(session.user.id)
    } else {
      nickname.value = ''
      isAdmin.value = false
    }
  })

  // 组件卸载时取消订阅
  onUnmounted(() => {
    subscription.unsubscribe()
  })
})

const handleLogout = async () => {
  await supabase.auth.signOut()
  user.value = null
  isAdmin.value = false
  nickname.value = ''
  ElMessage.success('已登出')
  router.push('/login')
}
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  min-height: 100vh;
}

.el-header {
  background-color: #409eff;
  color: white;
  display: flex;
  align-items: center;
  padding: 0 20px;
}

.header-content {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-content h1 {
  margin: 0;
  font-size: 20px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 15px;
}

.nav-menu {
  background-color: transparent;
  border-bottom: none;
  flex: 1;
  margin-right: 20px;
}

/* 未 hover 时菜单项的文本和溢出省略号颜色为白色 */
.nav-menu .el-menu-item {
  color: white;
  border-bottom: 2px solid transparent;
}
/* 针对 el-tooltip__trigger 或 el-sub-menu__title 内的省略号设置白色 */
.nav-menu .el-tooltip__trigger,
.nav-menu .el-sub-menu__title {
  color: white;
}

.nav-menu .el-menu-item:hover {
  background-color: rgba(255, 255, 255, 0.1);
  color: white;
}

.nav-menu .el-menu-item.is-active {
  border-bottom-color: white;
  color: white;
}

.username {
  font-weight: bold;
}

.el-main {
  padding: 20px;
}
</style>
