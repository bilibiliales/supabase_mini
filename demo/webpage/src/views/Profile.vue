<template>
  <div class="profile-container">
    <el-card>
      <template #header>
        <div style="display:flex;align-items:center;gap:16px">
          <div>
            <el-avatar v-if="profile.avatar" :src="profile.avatar" :size="80" />
            <el-avatar v-else :size="80">{{ displayUsername.charAt(0) || 'U' }}</el-avatar>
          </div>
          <h2>个人资料</h2>
        </div>
      </template>
      <el-form :model="profile" label-width="100px">
        <el-form-item label="用户ID">
          <el-input v-model="profile.id" disabled />
        </el-form-item>
        <el-form-item label="用户名">
          <el-input v-model="displayUsername" disabled />
        </el-form-item>
        <el-form-item label="邮箱">
          <el-input v-model="userEmail" disabled />
        </el-form-item>
        <el-form-item label="昵称">
          <el-input v-model="profile.nickname" placeholder="请输入昵称" />
        </el-form-item>
        <el-form-item label="头像URL">
          <el-input v-model="profile.avatar" placeholder="请输入头像URL" />
          <div style="margin-top:8px">
            <span style="color:#909399;">预览：</span>
            <el-avatar v-if="profile.avatar" :src="profile.avatar" :size="60" style="margin-left:8px" />
            <el-avatar v-else :size="60" style="margin-left:8px">{{ displayUsername.charAt(0) || 'U' }}</el-avatar>
          </div>
        </el-form-item>
        <el-form-item label="签名">
          <el-input v-model="profile.signature" type="textarea" :rows="3" placeholder="请输入个性签名" />
        </el-form-item>
        <el-form-item label="经验值">
          <el-input v-model="profile.exp" disabled />
        </el-form-item>
        <el-form-item label="角色">
          <el-tag :type="profile.role === 'admin' ? 'danger' : 'primary'">
            {{ profile.role === 'admin' ? '管理员' : '普通用户' }}
          </el-tag>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleInitProfile" :loading="initLoading">
            初始化资料
          </el-button>
          <el-button type="success" @click="handleUpdateProfile" :loading="updateLoading">
            更新资料
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card v-if="profile.role === 'admin'" style="margin-top: 20px">
      <template #header>
        <h2>管理员功能</h2>
      </template>
      <el-button type="success" @click="$router.push('/admin')">
        用户管理
      </el-button>
    </el-card>

    <el-card style="margin-top: 20px">
      <template #header>
        <h2>签到</h2>
      </template>
      <el-button type="primary" @click="handleCheckin" :loading="checkinLoading">
        今日签到
      </el-button>
      <div v-if="profile.last_checkin_date" style="margin-top: 10px; color: #67c23a">
        上次签到时间：{{ formatDate(profile.last_checkin_date) }}
      </div>
      <div v-if="checkinMessage" style="margin-top: 10px" :style="{ color: checkinSuccess ? '#67c23a' : '#f56c6c' }">
        {{ checkinMessage }}
      </div>
    </el-card>

    <el-card style="margin-top: 20px">
      <template #header>
        <h2>修改密码</h2>
      </template>
      <el-form :model="passwordForm" label-width="100px">
        <el-form-item label="原密码">
          <el-input v-model="passwordForm.currentPassword" type="password" show-password placeholder="可选，如后端要求验证" />
        </el-form-item>
        <el-form-item label="新密码">
          <el-input v-model="passwordForm.newPassword" type="password" show-password />
        </el-form-item>
        <el-form-item>
          <el-button type="warning" @click="handleChangePassword" :loading="passwordLoading">
            修改密码
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card style="margin-top: 20px">
      <template #header>
        <h2>退出登录</h2>
      </template>
      <el-button type="danger" @click="handleLogout">
        退出登录
      </el-button>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { supabase, invokeFunction } from '../lib/supabase'
import { ElMessage } from 'element-plus'

const router = useRouter()
const profile = reactive({
  id: '',
  nickname: '',
  avatar: '',
  signature: '',
  role: 'user',
  exp: 0,
  last_checkin_date: null
})

const currentUser = ref(null)

const passwordForm = reactive({
  currentPassword: '',
  newPassword: ''
})

const initLoading = ref(false)
const updateLoading = ref(false)
const checkinLoading = ref(false)
const passwordLoading = ref(false)
const checkinMessage = ref('')
const checkinSuccess = ref(false)

const displayUsername = computed(() => {
  if (currentUser.value?.email) {
    return currentUser.value.email.replace('@zdjl.com', '')
  }
  return ''
})

const userEmail = computed(() => {
  return currentUser.value?.email || ''
})

onMounted(async () => {
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    currentUser.value = user
    profile.id = user.id
    loadProfile()
  }
})

const loadProfile = async () => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', profile.id)
    .single()

  if (!error && data) {
    Object.assign(profile, data)
  }
}

const handleInitProfile = async () => {
  initLoading.value = true
  try {
    // 确保有有效的 session
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      throw new Error('未登录，请先登录')
    }

    // 从邮箱提取用户名作为默认昵称
    const defaultNickname = currentUser.value?.email?.replace('@zdjl.com', '') || '用户'
    
    const { data, error } = await invokeFunction('init-profile', { body: { nickname: defaultNickname } })

    if (error) {
      // 尝试从 error 中获取更友好的信息
      const msg = error.message || '初始化资料失败'
      // 如果资料已存在，忽略提示
      if (!/资料已经存在|already exists/i.test(msg)) {
        ElMessage.error(msg)
      }
      return
    }

    // data 可能为 { ok: false, message: '资料已经存在' } 或成功结构
    if (data && data.ok === false) {
      // 忽略已有资料的情况
      if (data.message && /资料已经存在|already exists/i.test(data.message)) {
        // 不提示错误
      } else {
        ElMessage.info(data.message || '初始化返回')
      }
    } else {
      ElMessage.success('初始化成功')
      loadProfile()
    }
  } catch (err) {
    console.error('初始化错误:', err)
    ElMessage.error(err.message || '初始化失败')
  } finally {
    initLoading.value = false
  }
}

const handleUpdateProfile = async () => {
  if (!profile.nickname) {
    ElMessage.warning('请填写昵称')
    return
  }

  updateLoading.value = true
  try {
    // 确保有有效的 session
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      throw new Error('未登录，请先登录')
    }

    const { data, error } = await invokeFunction('update-profile', { body: { nickname: profile.nickname, avatar: profile.avatar, signature: profile.signature } })

    if (error) {
      throw error
    }

    ElMessage.success('更新成功')
    loadProfile()
  } catch (err) {
    console.error('更新错误:', err)
    ElMessage.error(err.message || '更新失败')
  } finally {
    updateLoading.value = false
  }
}

const handleCheckin = async () => {
  checkinLoading.value = true
  checkinMessage.value = ''
  checkinSuccess.value = false
  
  try {
    // 确保有有效的 session
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      throw new Error('未登录，请先登录')
    }

    const { data, error } = await invokeFunction('daily-checkin', { body: {} })

    if (error) throw error

    if (data.ok) {
      ElMessage.success(data.message || '签到成功')
      checkinMessage.value = `签到成功！获得 ${data.addExp} 经验值，当前经验值：${data.exp}`
      checkinSuccess.value = true
      profile.last_checkin_date = data.lastCheckinDate
      profile.exp = data.exp
    } else {
      checkinMessage.value = data.message || '今天已经签到过了'
      checkinSuccess.value = false
    }
  } catch (err) {
    console.error('签到错误:', err)
    checkinMessage.value = `签到失败: ${err.message}`
    checkinSuccess.value = false
    ElMessage.error(checkinMessage.value)
  } finally {
    checkinLoading.value = false
  }
}

const handleLogout = async () => {
  try {
    await supabase.auth.signOut()
    ElMessage.success('已退出登录')
    router.push('/login')
  } catch (err) {
    ElMessage.error('退出登录失败')
  }
}

const handleChangePassword = async () => {
  if (!passwordForm.newPassword) {
    ElMessage.warning('请输入新密码')
    return
  }

  passwordLoading.value = true
  try {
    // 根据 Supabase 官方文档，使用 current_password 参数
    const updateData = {
      password: passwordForm.newPassword
    }

    // 如果填写了原密码，传递给 Supabase Auth API
    if (passwordForm.currentPassword) {
      updateData.current_password = passwordForm.currentPassword
    }

    const { data, error } = await supabase.auth.updateUser(updateData)

    // SDK 返回 200 且 error 为 null 即表示成功
    if (error) {
      throw error
    }

    ElMessage.success('密码修改成功')
    passwordForm.currentPassword = ''
    passwordForm.newPassword = ''
  } catch (err) {
    console.error('修改密码错误:', err)
    ElMessage.error(err.message || '密码修改失败')
  } finally {
    passwordLoading.value = false
  }
}

const formatDate = (date) => {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('zh-CN')
}
</script>

<style scoped>
.profile-container {
  max-width: 800px;
  margin: 0 auto;
}

.profile-container h2 {
  margin: 0;
}
</style>
