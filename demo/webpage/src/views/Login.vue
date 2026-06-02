<template>
  <div class="login-container">
    <el-card class="login-card">
      <template #header>
        <h2>{{ isLogin ? '用户登录' : '用户注册' }}</h2>
      </template>
      <el-form :model="form" label-width="80px">
        <el-form-item label="用户名">
          <el-input v-model="form.username" placeholder="请输入用户名" />
        </el-form-item>
        <el-form-item label="密码">
          <el-input v-model="form.password" type="password" placeholder="请输入密码" show-password />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSubmit" :loading="loading" style="width: 100%">
            {{ isLogin ? '登录' : '注册' }}
          </el-button>
        </el-form-item>
        <el-form-item>
          <el-button @click="toggleMode" style="width: 100%">
            {{ isLogin ? '没有账号？去注册' : '已有账号？去登录' }}
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { supabase, invokeFunction } from '../lib/supabase'
import { ElMessage } from 'element-plus'

const router = useRouter()
const isLogin = ref(true)
const loading = ref(false)

const form = reactive({
  username: '',
  password: ''
})

const getEmailFromUsername = (username) => {
  return `${username}@zdjl.com`
}

const toggleMode = () => {
  isLogin.value = !isLogin.value
  form.username = ''
  form.password = ''
}

const handleSubmit = async () => {
  if (!form.username || !form.password) {
    ElMessage.warning('请填写用户名和密码')
    return
  }

  const email = getEmailFromUsername(form.username)

  loading.value = true
  try {
    let result
    if (isLogin.value) {
      result = await supabase.auth.signInWithPassword({
        email: email,
        password: form.password
      })
    } else {
      result = await supabase.auth.signUp({
        email: email,
        password: form.password
      })
    }

    if (result.error) {
      throw result.error
    }

    ElMessage.success(isLogin.value ? '登录成功' : '注册成功')

    // 注册成功后自动尝试初始化资料（若已存在则忽略）
    if (!isLogin.value) {
      try {
        const defaultNickname = form.username || email.replace('@zdjl.com', '')
        const { data, error } = await invokeFunction('init-profile', { body: { nickname: defaultNickname } })
        if (error) {
          // 若返回 403 或 自定义错误 { error: 'Forbidden' }，尝试显示更友好的信息
          const msg = error.message || '初始化资料失败'
          // 如果是资料已存在的情况，不必打扰用户
          if (!/资料已经存在|already exists/i.test(msg)) {
            ElMessage.info(msg)
          }
        } else {
          // 如果 data 表示已经存在或成功，静默处理或提示成功
          if (data && data.ok === false && /资料已经存在/.test(data.message || '')) {
            // 忽略
          } else {
            // 可以提示初始化成功（非必要）
            // ElMessage.success('已为您初始化资料')
          }
        }
      } catch (e) {
        // 忽略初始化的小错误，不影响注册流程
        console.warn('初始化资料异常', e)
      }
    }

    router.push('/profile')
  } catch (error) {
    // 错误对象可能是由 invokeFunction 解析出的 Error，或者 Supabase 返回的 Error
    const msg = error?.message || (typeof error === 'string' ? error : '操作失败')
    ElMessage.error(msg)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 60vh;
}

.login-card {
  width: 400px;
}

.login-card h2 {
  margin: 0;
  text-align: center;
}
</style>
