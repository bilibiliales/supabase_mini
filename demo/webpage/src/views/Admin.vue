<template>
  <div class="admin-container">
    <el-card>
      <template #header>
        <div class="card-header">
          <h2>用户管理</h2>
          <el-button type="primary" @click="loadUsers" :loading="loading">
            加载用户列表
          </el-button>
        </div>
      </template>

      <el-table :data="users" stripe style="width: 100%">
        <el-table-column prop="nickname" label="昵称" width="150" />
        <el-table-column prop="avatar" label="头像" width="100">
          <template #default="{ row }">
            <el-avatar v-if="row.avatar" :size="40" :src="row.avatar" />
            <el-avatar v-else :size="40">{{ row.nickname?.charAt(0) }}</el-avatar>
          </template>
        </el-table-column>
        <el-table-column prop="signature" label="签名" min-width="200" show-overflow-tooltip />
        <el-table-column prop="role" label="角色" width="100">
          <template #default="{ row }">
            <el-tag :type="row.role === 'admin' ? 'danger' : 'primary'" size="small">
              {{ row.role === 'admin' ? '管理员' : '用户' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="exp" label="经验值" width="100" />
        <el-table-column prop="created_at" label="注册时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100">
          <template #default="{ row }">
            <el-button size="small" @click="editUser(row)">编辑</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div v-if="users.length === 0 && !loading" class="empty-tip">
        暂无用户数据，点击"加载用户列表"获取数据
      </div>
    </el-card>

    <!-- 编辑用户对话框 -->
    <el-dialog v-model="dialogVisible" title="编辑用户" width="600px">
      <el-form :model="editForm" label-width="100px">
        <el-form-item label="用户ID">
          <el-input v-model="editForm.id" disabled />
        </el-form-item>
        <el-form-item label="昵称">
          <el-input v-model="editForm.nickname" placeholder="请输入昵称" />
        </el-form-item>
        <el-form-item label="头像URL">
          <el-input v-model="editForm.avatar" placeholder="请输入头像URL" />
        </el-form-item>
        <el-form-item label="签名">
          <el-input v-model="editForm.signature" type="textarea" :rows="3" placeholder="请输入个性签名" />
        </el-form-item>
        <el-form-item label="角色">
          <el-select v-model="editForm.role" style="width: 100%">
            <el-option label="普通用户" value="user" />
            <el-option label="管理员" value="admin" />
          </el-select>
        </el-form-item>
        <el-form-item label="经验值">
          <el-input-number v-model="editForm.exp" :min="0" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleUpdateUser" :loading="updateLoading">
          保存
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { supabase, invokeFunction } from '../lib/supabase'
import { ElMessage } from 'element-plus'

const users = ref([])
const loading = ref(false)
const updateLoading = ref(false)
const dialogVisible = ref(false)

const editForm = reactive({
  id: '',
  nickname: '',
  avatar: '',
  signature: '',
  role: 'user',
  exp: 0
})

const loadUsers = async () => {
  loading.value = true
  try {
    // 确保有有效的 session
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      throw new Error('未登录，请先登录')
    }

    const { data, error } = await invokeFunction('admin-list-users', { body: {} })

    if (error) throw error

    users.value = data.users || []
    ElMessage.success(`加载成功，共 ${users.value.length} 个用户`)
  } catch (err) {
    console.error('加载用户错误:', err)
    ElMessage.error(err.message)
  } finally {
    loading.value = false
  }
}

const editUser = (user) => {
  editForm.id = user.id
  editForm.nickname = user.nickname || ''
  editForm.avatar = user.avatar || ''
  editForm.signature = user.signature || ''
  editForm.role = user.role || 'user'
  editForm.exp = user.exp || 0
  dialogVisible.value = true
}

const handleUpdateUser = async () => {
  updateLoading.value = true
  try {
    // 确保有有效的 session
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      throw new Error('未登录，请先登录')
    }

    const { data, error } = await invokeFunction('admin-update-user', { body: { targetId: editForm.id, nickname: editForm.nickname, avatar: editForm.avatar, signature: editForm.signature, role: editForm.role, exp: editForm.exp } })

    if (error) throw error

    ElMessage.success('更新成功')
    dialogVisible.value = false
    loadUsers()
  } catch (err) {
    console.error('更新用户错误:', err)
    ElMessage.error(err.message)
  } finally {
    updateLoading.value = false
  }
}

const formatDate = (date) => {
  return new Date(date).toLocaleString('zh-CN')
}
</script>

<style scoped>
.admin-container {
  max-width: 1400px;
  margin: 0 auto;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-header h2 {
  margin: 0;
}

.empty-tip {
  text-align: center;
  padding: 40px;
  color: #909399;
}
</style>
