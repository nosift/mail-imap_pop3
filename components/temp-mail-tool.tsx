"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
  Mail,
  Copy,
  Check,
  RefreshCw,
  Zap,
  Package,
  Wallet,
  Inbox,
  LogIn,
  ChevronDown,
  ChevronUp,
  History,
  Trash2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import PasswordGenerator from "@/components/password-generator"
import { useToast } from "@/hooks/use-toast"
import { Toaster } from "@/components/ui/toaster"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

// 生成随机英文名
const generateRandomName = () => {
  const firstNames = [
    "James",
    "John",
    "Robert",
    "Michael",
    "William",
    "David",
    "Richard",
    "Joseph",
    "Thomas",
    "Christopher",
    "Daniel",
    "Matthew",
    "Anthony",
    "Mark",
    "Donald",
    "Steven",
    "Andrew",
    "Kenneth",
    "Joshua",
    "Kevin",
  ]
  const lastNames = [
    "Smith",
    "Johnson",
    "Williams",
    "Brown",
    "Jones",
    "Garcia",
    "Miller",
    "Davis",
    "Rodriguez",
    "Martinez",
    "Hernandez",
    "Lopez",
    "Gonzalez",
    "Wilson",
    "Anderson",
    "Thomas",
    "Taylor",
    "Moore",
    "Jackson",
    "Martin",
  ]

  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)]
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)]

  return `${firstName} ${lastName}`
}

interface StockData {
  hotmail: number
  outlook: number
}

interface EmailAccount {
  email: string
  password: string
  refreshToken: string
  clientId: string
}

interface SavedAccount extends EmailAccount {
  savedAt: number // 保存时间戳
}

interface EmailMessage {
  id: string // 添加邮件ID字段
  subject: string
  from: string
  bodyPreview: string
  receivedDateTime: string
  body?: string // 添加完整邮件内容字段
  bodyType?: "text" | "html" // 添加内容类型字段
  folder?: string // 添加邮件文件夹字段
}

export default function TempMailTool() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [verificationCode, setVerificationCode] = useState("")
  const [isReceiving, setIsReceiving] = useState(false)
  const [copiedItem, setCopiedItem] = useState<string | null>(null)
  const { toast } = useToast()

  const [stock, setStock] = useState<StockData>({ hotmail: 0, outlook: 0 })
  const [balance, setBalance] = useState<number>(0)
  const [apiKey, setApiKey] = useState("0000000000000000000000000000000000000000")
  const [emailType, setEmailType] = useState<"outlook" | "hotmail">("outlook")
  const [quantity, setQuantity] = useState(1)
  const [isLoadingStock, setIsLoadingStock] = useState(false)
  const [isLoadingBalance, setIsLoadingBalance] = useState(false)
  const [isExtractingEmail, setIsExtractingEmail] = useState(false)
  const [retryStatus, setRetryStatus] = useState("")

  const [emailAccount, setEmailAccount] = useState<EmailAccount | null>(null)
  const [messages, setMessages] = useState<EmailMessage[]>([])
  const [checkInterval, setCheckInterval] = useState<NodeJS.Timeout | null>(null)
  const [receivingStatus, setReceivingStatus] = useState<"idle" | "receiving" | "received" | "failed">("idle")
  const [checkCount, setCheckCount] = useState(0)

  const [manualEmail, setManualEmail] = useState("")
  const [manualPassword, setManualPassword] = useState("")
  const [manualRefreshToken, setManualRefreshToken] = useState("")
  const [manualClientId, setManualClientId] = useState("")
  const [loginMode, setLoginMode] = useState<"auto" | "manual">("auto")

  const [savedAccounts, setSavedAccounts] = useState<SavedAccount[]>([])
  const [showHistory, setShowHistory] = useState(false)

  const [expandedMessageIndex, setExpandedMessageIndex] = useState<number | null>(null) // 添加展开状态
  const [loadingMessageBody, setLoadingMessageBody] = useState<{ [key: number]: boolean }>({}) // 添加加载状态
  const [mailFolder, setMailFolder] = useState<"inbox" | "junk">("inbox")

  const codeFoundRef = useRef(false)

  useEffect(() => {
    const saved = localStorage.getItem("savedEmailAccounts")
    if (saved) {
      try {
        setSavedAccounts(JSON.parse(saved))
      } catch (e) {
        console.error("Failed to load saved accounts:", e)
      }
    }
  }, [])

  useEffect(() => {
    if (emailAccount && !verificationCode) {
      codeFoundRef.current = false
      handleStartReceiving()
    }

    return () => {
      if (checkInterval) {
        clearInterval(checkInterval)
      }
    }
  }, [emailAccount])

  useEffect(() => {
    fetchStock()
    if (apiKey) {
      fetchBalance()
    }
  }, [])

  const fetchStock = async () => {
    setIsLoadingStock(true)
    try {
      const response = await fetch("https://zizhu.shanyouxiang.com/kucun")
      if (response.ok) {
        const data: StockData = await response.json()
        setStock(data)
      } else {
        toast({
          title: "获取库存失败",
          description: "无法连接到服务器",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "获取库存失败",
        description: "网络错误",
        variant: "destructive",
      })
    } finally {
      setIsLoadingStock(false)
    }
  }

  const fetchBalance = async () => {
    if (!apiKey) {
      toast({
        title: "请输入API Key",
        variant: "destructive",
      })
      return
    }

    setIsLoadingBalance(true)
    try {
      const response = await fetch(`https://zizhu.shanyouxiang.com/yue?card=${apiKey}`)
      if (response.ok) {
        const data = await response.json()
        setBalance(data.num)
      } else {
        toast({
          title: "获取余额失败",
          description: "请检查API Key是否正确",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "获取余额失败",
        description: "网络错误",
        variant: "destructive",
      })
    } finally {
      setIsLoadingBalance(false)
    }
  }

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedItem(label)
      toast({
        title: "复制成功",
        description: `${label}已复制到剪贴板`,
      })
      setTimeout(() => setCopiedItem(null), 2000)

      if (label === "名字") {
        setTimeout(() => {
          setName(generateRandomName())
        }, 300)
      }
    } catch (err) {
      toast({
        title: "复制失败",
        description: "请手动复制内容",
        variant: "destructive",
      })
    }
  }

  const saveAccountToHistory = (account: EmailAccount) => {
    const newSavedAccount: SavedAccount = {
      ...account,
      savedAt: Date.now(),
    }

    // 检查是否已存在相同邮箱
    const existingIndex = savedAccounts.findIndex((a) => a.email === account.email)
    let updatedAccounts: SavedAccount[]

    if (existingIndex >= 0) {
      // 更新已存在的账号
      updatedAccounts = [...savedAccounts]
      updatedAccounts[existingIndex] = newSavedAccount
    } else {
      // 添加新账号，最多保存20个
      updatedAccounts = [newSavedAccount, ...savedAccounts].slice(0, 20)
    }

    setSavedAccounts(updatedAccounts)
    localStorage.setItem("savedEmailAccounts", JSON.stringify(updatedAccounts))
  }

  const loadAccountFromHistory = (account: SavedAccount) => {
    setManualEmail(account.email)
    setManualPassword(account.password)
    setManualRefreshToken(account.refreshToken)
    setManualClientId(account.clientId)
    setLoginMode("manual")
    setShowHistory(false)

    toast({
      title: "已加载账号",
      description: `已将 ${account.email} 填入手动登录表单`,
    })
  }

  const deleteAccountFromHistory = (email: string) => {
    const updatedAccounts = savedAccounts.filter((a) => a.email !== email)
    setSavedAccounts(updatedAccounts)
    localStorage.setItem("savedEmailAccounts", JSON.stringify(updatedAccounts))

    toast({
      title: "已删除",
      description: "账号已从历史记录中移除",
    })
  }

  const clearAllHistory = () => {
    setSavedAccounts([])
    localStorage.removeItem("savedEmailAccounts")

    toast({
      title: "已清空",
      description: "所有历史记录已清空",
    })
  }

  const handleGetEmail = async () => {
    if (!apiKey) {
      toast({
        title: "请输入API Key",
        variant: "destructive",
      })
      return
    }

    if (quantity < 1 || quantity > 2000) {
      toast({
        title: "提取数量无效",
        description: "请输入1-2000之间的数量",
        variant: "destructive",
      })
      return
    }

    setIsExtractingEmail(true)
    setVerificationCode("")
    setReceivingStatus("idle")
    setMessages([])
    setRetryStatus("")
    setEmail("")
    setPassword("")
    setEmailAccount(null)
    setCheckCount(0)

    if (checkInterval) {
      clearInterval(checkInterval)
      setCheckInterval(null)
    }

    let totalExtracted = 0
    let attempts = 0
    let firstEmailSet = false
    const allExtractedEmails: string[] = []

    while (totalExtracted < quantity) {
      attempts++

      setRetryStatus(`正在重试第 ${attempts} 次 (已提取: ${totalExtracted}/${quantity})`)

      const remainingQuantity = quantity - totalExtracted

      const concurrentRequests = Math.min(10, Math.ceil(remainingQuantity / 1))
      const requestQuantity = Math.ceil(remainingQuantity / concurrentRequests)

      console.log(
        "[v0] Remaining:",
        remainingQuantity,
        "Concurrent:",
        concurrentRequests,
        "Per request:",
        requestQuantity,
      )

      const promises = []

      for (let i = 0; i < concurrentRequests; i++) {
        promises.push(
          fetch(`https://zizhu.shanyouxiang.com/huoqu?shuliang=${requestQuantity}&leixing=${emailType}&card=${apiKey}`)
            .then(async (response) => {
              if (response.ok) {
                const text = await response.text()
                console.log("[v0] API response length:", text.length)
                const lines = text
                  .trim()
                  .split("\n")
                  .filter((line) => {
                    const trimmedLine = line.trim()
                    return trimmedLine.length > 0 && trimmedLine.includes("----")
                  })
                console.log("[v0] Valid lines from this request:", lines.length)
                return lines
              }
              return []
            })
            .catch((err) => {
              console.log("[v0] API error:", err)
              return []
            }),
        )
      }

      const results = await Promise.all(promises)
      const allLines = results.flat()

      console.log("[v0] Total lines from all requests:", allLines.length)

      if (allLines.length > 0) {
        const neededLines = allLines.slice(0, remainingQuantity)
        console.log("[v0] Taking only needed lines:", neededLines.length)

        allExtractedEmails.push(...neededLines)

        if (!firstEmailSet && neededLines.length > 0) {
          const firstLine = neededLines[0]
          const parts = firstLine.split("----")

          console.log("[v0] First email parts:", parts.length)

          if (parts.length >= 4) {
            const accountInfo: EmailAccount = {
              email: parts[0].trim(),
              password: parts[1].trim(),
              refreshToken: parts[2].trim(),
              clientId: parts[3].trim(),
            }

            console.log("[v0] Setting email account:", accountInfo.email)

            setEmail(accountInfo.email)
            setPassword(accountInfo.password)
            setEmailAccount(accountInfo)
            saveAccountToHistory(accountInfo)
            firstEmailSet = true
          }
        }

        totalExtracted += neededLines.length

        console.log("[v0] Total extracted so far:", totalExtracted, "Target:", quantity)

        toast({
          title: `已提取 ${totalExtracted}/${quantity} 个邮箱`,
          description: totalExtracted >= quantity ? "提取完成，正在登录接收邮件..." : "继续提取中...",
        })

        if (totalExtracted >= quantity) {
          break
        }
      }

      await new Promise((resolve) => setTimeout(resolve, 100))
    }

    if (totalExtracted >= quantity) {
      setIsExtractingEmail(false)
      setRetryStatus("")
      fetchBalance()

      console.log("[v0] Extraction complete. Total emails:", allExtractedEmails.length)

      toast({
        title: "邮箱提取成功",
        description: `已成功提取 ${totalExtracted} 个邮箱，正在自动登录接收邮件...`,
      })
    } else {
      setIsExtractingEmail(false)
      setRetryStatus("")
      toast({
        title: "提取失败",
        description: "未能提取到足够的邮箱，请重试",
        variant: "destructive",
      })
    }
  }

  const fetchInboxMessages = useCallback(async () => {
    if (codeFoundRef.current) {
      console.log("[v0] Code already found, skipping check")
      return
    }

    setCheckCount((prev) => prev + 1)
    const currentCheck = checkCount + 1

    console.log("[v0] Checking all folders, attempt:", currentCheck)
    console.log("[v0] Email account:", emailAccount.email)
    console.log("[v0] Client ID:", emailAccount.clientId)
    console.log("[v0] Refresh token length:", emailAccount.refreshToken.length)

    try {
      const folders = ["inbox", "junk"]
      let allMessages: EmailMessage[] = []
      let codeFound: string | null = null

      for (const folder of folders) {
        const response = await fetch("/api/outlook/inbox", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            refreshToken: emailAccount.refreshToken,
            clientId: emailAccount.clientId,
            folder: folder,
          }),
        })

        console.log(`[v0] API response status for ${folder}:`, response.status)

        if (response.ok) {
          const data = await response.json()
          console.log(`[v0] Messages received from ${folder}:`, data.messages?.length || 0)

          if (data.messages && data.messages.length > 0) {
            // 为消息添加folder标识
            const messagesWithFolder = data.messages.map((msg: EmailMessage) => ({
              ...msg,
              folder: folder,
            }))
            allMessages = [...allMessages, ...messagesWithFolder]

            const extractedCode = extractVerificationCode(data.messages)
            if (extractedCode && !codeFound) {
              codeFound = extractedCode
            }
          }
        } else {
          const errorData = await response.json()
          console.error(`[v0] API error response for ${folder}:`, errorData)

          if (response.status === 503) {
            console.log(`[v0] 503 error for ${folder}, will retry...`)
            continue
          }
        }
      }

      if (mailFolder === "junk") {
        const junkMessages = allMessages.filter((msg: any) => msg.folder === "junk")
        setMessages(junkMessages)
      } else {
        const inboxMessages = allMessages.filter((msg: any) => msg.folder === "inbox")
        setMessages(inboxMessages)
      }

      if (codeFound && !codeFoundRef.current) {
        codeFoundRef.current = true
        setVerificationCode(codeFound)
        setReceivingStatus("received")
        setIsReceiving(false)

        if (checkInterval) {
          clearInterval(checkInterval)
          setCheckInterval(null)
        }

        console.log("[v0] Code found in folders and set, interval cleared")

        toast({
          title: "收到新邮件",
          description: `验证码：${codeFound}`,
        })
      }
    } catch (error) {
      console.error("[v0] Error fetching messages:", error)
    }
  }, [emailAccount, checkCount, checkInterval, mailFolder, toast])

  const extractVerificationCode = (messages: EmailMessage[]): string | null => {
    for (const message of messages) {
      const text = `${message.subject} ${message.bodyPreview}`
      console.log("[v0] Checking message text:", text.substring(0, 100))

      const match6 = text.match(/\b\d{6}\b/)
      if (match6) {
        console.log("[v0] Found 6-digit code:", match6[0])
        return match6[0]
      }

      const matchDigits = text.match(/\b\d{4,8}\b/)
      if (matchDigits) {
        console.log("[v0] Found digit code:", matchDigits[0])
        return matchDigits[0]
      }

      const matchAlphaNum = text.match(/\b[A-Z0-9]{4,10}\b/)
      if (matchAlphaNum && /\d/.test(matchAlphaNum[0])) {
        console.log("[v0] Found alphanumeric code:", matchAlphaNum[0])
        return matchAlphaNum[0]
      }

      const matchToken = text.match(/\b[A-Z0-9]+-[A-Z0-9]+-[A-Z0-9]+\b/i)
      if (matchToken) {
        console.log("[v0] Found token code:", matchToken[0])
        return matchToken[0]
      }

      const matchCode = text.match(/(?:code|verification|verify|otp|验证码|код|pin)[:\s]*([A-Z0-9-]{4,15})/i)
      if (matchCode) {
        console.log("[v0] Found code after keyword:", matchCode[1])
        return matchCode[1]
      }
    }

    console.log("[v0] No verification code found")
    return null
  }

  const handleStartReceiving = () => {
    if (!emailAccount) {
      console.log("[v0] No email account set")
      return
    }

    console.log("[v0] Starting to receive messages")
    codeFoundRef.current = false
    setIsReceiving(true)
    setReceivingStatus("receiving")
    setCheckCount(0)

    fetchInboxMessages()

    const interval = setInterval(() => {
      if (!codeFoundRef.current) {
        fetchInboxMessages()
      } else {
        clearInterval(interval)
        setCheckInterval(null)
        console.log("[v0] Interval stopped due to code found")
      }
    }, 10000)

    setCheckInterval(interval)
  }

  const handleRefreshName = () => {
    setName(generateRandomName())
  }

  const handleManualLogin = () => {
    if (!manualEmail || !manualPassword || !manualRefreshToken || !manualClientId) {
      toast({
        title: "请填写完整信息",
        description: "邮箱、密码、刷新令牌和Client ID都是必填项",
        variant: "destructive",
      })
      return
    }

    const accountInfo: EmailAccount = {
      email: manualEmail,
      password: manualPassword,
      refreshToken: manualRefreshToken,
      clientId: manualClientId,
    }

    setEmail(manualEmail)
    setPassword(manualPassword)
    setEmailAccount(accountInfo)
    saveAccountToHistory(accountInfo)
    setVerificationCode("")
    setReceivingStatus("idle")
    setMessages([])
    setCheckCount(0)

    if (checkInterval) {
      clearInterval(checkInterval)
      setCheckInterval(null)
    }

    toast({
      title: "登录成功",
      description: "正在开始接收邮件...",
    })
  }

  const handleAutoFillManualLogin = () => {
    if (emailAccount) {
      setManualEmail(emailAccount.email)
      setManualPassword(emailAccount.password)
      setManualRefreshToken(emailAccount.refreshToken)
      setManualClientId(emailAccount.clientId)
      setLoginMode("manual")

      toast({
        title: "已自动填写",
        description: "已将提取的邮箱信息填入手动登录表单",
      })
    }
  }

  const fetchMessageBody = async (messageId: string, index: number) => {
    if (!emailAccount) return

    console.log("[v0] Fetching message body for ID:", messageId)
    console.log("[v0] Message at index:", index, messages[index])

    setLoadingMessageBody((prev) => ({ ...prev, [index]: true }))

    try {
      const response = await fetch("/api/outlook/message", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          refreshToken: emailAccount.refreshToken,
          clientId: emailAccount.clientId,
          messageId: messageId,
        }),
      })

      console.log("[v0] Message body response status:", response.status)

      if (response.ok) {
        const data = await response.json()

        setMessages((prev) =>
          prev.map((msg, idx) => {
            if (idx === index) {
              return {
                ...msg,
                body: data.body,
                bodyType: data.bodyType,
              }
            }
            return msg
          }),
        )
      } else {
        const errorData = await response.json()
        console.error("[v0] Failed to fetch message body:", errorData)
      }
    } catch (error) {
      console.error("[v0] Error fetching message body:", error)
    } finally {
      setLoadingMessageBody((prev) => ({ ...prev, [index]: false }))
    }
  }

  const handleToggleMessage = (index: number, messageId: string) => {
    const newExpandedIndex = expandedMessageIndex === index ? null : index
    setExpandedMessageIndex(newExpandedIndex)

    if (newExpandedIndex === index && !messages[index].body) {
      fetchMessageBody(messageId, index)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full mb-6">
          <Zap className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-primary">闪邮箱工具</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-bold mb-4 text-balance">快速生成临时邮箱</h1>
        <p className="text-lg text-muted-foreground text-balance max-w-2xl mx-auto">
          一键生成随机身份信息，保护您的隐私安全
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card className="p-4 bg-card/50 backdrop-blur border-border/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Package className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">Outlook库存</h3>
                <p className="text-xl font-bold">{isLoadingStock ? "..." : (stock?.outlook ?? 0).toLocaleString()}</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={fetchStock} disabled={isLoadingStock}>
              <RefreshCw className={cn("w-4 h-4", isLoadingStock && "animate-spin")} />
            </Button>
          </div>
        </Card>

        <Card className="p-4 bg-card/50 backdrop-blur border-border/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent/10">
                <Package className="w-5 h-5 text-accent" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">Hotmail库存</h3>
                <p className="text-xl font-bold">{isLoadingStock ? "..." : (stock?.hotmail ?? 0).toLocaleString()}</p>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-card/50 backdrop-blur border-border/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <Wallet className="w-5 h-5 text-success" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">账户余额</h3>
                <p className="text-xl font-bold">{isLoadingBalance ? "..." : (balance ?? 0).toLocaleString()}</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={fetchBalance} disabled={isLoadingBalance || !apiKey}>
              <RefreshCw className={cn("w-4 h-4", isLoadingBalance && "animate-spin")} />
            </Button>
          </div>
        </Card>
      </div>

      <Card className="p-6 bg-card border-border mb-6">
        <Label className="text-base font-semibold mb-4 block">API Key 配置</Label>
        <Input
          type="text"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="请输入API Key"
          className="font-mono"
        />
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <Card className="p-6 bg-card border-border">
            <Label className="text-base font-semibold mb-4 block">随机英文名</Label>
            <div className="flex items-center gap-2">
              <div className="flex-1 px-4 py-3 bg-secondary rounded-lg border border-border font-mono text-lg">
                {name || "点击刷新生成"}
              </div>
              <Button variant="ghost" size="sm" onClick={handleRefreshName} className="h-8 px-2">
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </Card>

          <Card className="p-6 bg-card border-border">
            <div className="flex items-center justify-between mb-4">
              <Label className="text-base font-semibold">临时邮箱提取</Label>
              <Button variant="ghost" size="sm" onClick={() => setShowHistory(!showHistory)} className="h-8 gap-1">
                <History className="w-4 h-4" />
                <span className="text-xs">历史记录 ({savedAccounts.length})</span>
              </Button>
            </div>

            {showHistory && (
              <div className="mb-4 p-3 bg-secondary/50 rounded-lg border border-border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold">近期提取的邮箱</span>
                  {savedAccounts.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearAllHistory}
                      className="h-6 text-xs text-destructive hover:text-destructive"
                    >
                      清空全部
                    </Button>
                  )}
                </div>
                {savedAccounts.length === 0 ? (
                  <div className="text-xs text-muted-foreground text-center py-4">暂无历史记录</div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {savedAccounts.map((account, index) => (
                      <div
                        key={account.email + index}
                        className="flex items-center justify-between p-2 bg-background/50 rounded border border-border/50 hover:bg-background/80 transition-colors"
                      >
                        <div className="flex-1 min-w-0 mr-2">
                          <div className="text-xs font-mono truncate">{account.email}</div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(account.savedAt).toLocaleString("zh-CN", {
                              month: "numeric",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => loadAccountFromHistory(account)}
                            className="h-7 px-2 text-xs"
                          >
                            <LogIn className="w-3 h-3 mr-1" />
                            使用
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteAccountFromHistory(account.email)}
                            className="h-7 px-2 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <Tabs
              value={loginMode}
              onValueChange={(value) => setLoginMode(value as "auto" | "manual")}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="auto">自动提取</TabsTrigger>
                <TabsTrigger value="manual">手动登录</TabsTrigger>
              </TabsList>

              <TabsContent value="auto" className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-sm mb-2 block">邮箱类型</Label>
                    <Select value={emailType} onValueChange={(value: "outlook" | "hotmail") => setEmailType(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="outlook">Outlook</SelectItem>
                        <SelectItem value="hotmail">Hotmail</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-sm mb-2 block">提取数量</Label>
                    <Input
                      type="number"
                      value={quantity}
                      onChange={(e) => setQuantity(Number(e.target.value))}
                      min={1}
                      max={2000}
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-sm mb-2 block">邮箱地址</Label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 px-4 py-3 bg-secondary rounded-lg border border-border font-mono text-sm break-all">
                      {email || "点击下方按钮提取邮箱"}
                    </div>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => copyToClipboard(email, "邮箱")}
                      disabled={!email}
                      className="shrink-0"
                    >
                      {copiedItem === "邮箱" ? (
                        <Check className="w-4 h-4 text-success" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div>
                  <Label className="text-sm mb-2 block">邮箱密码</Label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 px-4 py-3 bg-secondary rounded-lg border border-border font-mono text-sm break-all">
                      {password || "提取后显示"}
                    </div>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => copyToClipboard(password, "密码")}
                      disabled={!password}
                      className="shrink-0"
                    >
                      {copiedItem === "密码" ? (
                        <Check className="w-4 h-4 text-success" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div>
                  <Label className="text-sm mb-2 block">刷新令牌 (Refresh Token)</Label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 px-3 py-2 bg-secondary rounded-lg border border-border font-mono text-xs overflow-x-auto whitespace-nowrap scrollbar-thin">
                      {emailAccount?.refreshToken || "提取后显示"}
                    </div>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => copyToClipboard(emailAccount?.refreshToken || "", "刷新令牌")}
                      disabled={!emailAccount?.refreshToken}
                      className="shrink-0"
                    >
                      {copiedItem === "刷新令牌" ? (
                        <Check className="w-4 h-4 text-success" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div>
                  <Label className="text-sm mb-2 block">Client ID</Label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 px-3 py-2 bg-secondary rounded-lg border border-border font-mono text-xs overflow-x-auto whitespace-nowrap scrollbar-thin">
                      {emailAccount?.clientId || "提取后显示"}
                    </div>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => copyToClipboard(emailAccount?.clientId || "", "Client ID")}
                      disabled={!emailAccount?.clientId}
                      className="shrink-0"
                    >
                      {copiedItem === "Client ID" ? (
                        <Check className="w-4 h-4 text-success" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {isExtractingEmail && retryStatus && (
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground bg-secondary/50 rounded-lg py-2 px-3">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>{retryStatus}</span>
                  </div>
                )}

                <Button onClick={handleGetEmail} className="w-full" size="lg" disabled={isExtractingEmail || !apiKey}>
                  {isExtractingEmail ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      提取中...
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4 mr-2" />
                      提取临时邮箱
                    </>
                  )}
                </Button>

                {emailAccount && (
                  <Button
                    onClick={handleAutoFillManualLogin}
                    variant="outline"
                    className="w-full bg-transparent"
                    size="sm"
                  >
                    <LogIn className="w-4 h-4 mr-2" />
                    一键填写到手动登录
                  </Button>
                )}
              </TabsContent>

              <TabsContent value="manual" className="space-y-3">
                <div>
                  <Label className="text-sm mb-2 block">邮箱地址</Label>
                  <Input
                    type="email"
                    value={manualEmail}
                    onChange={(e) => setManualEmail(e.target.value)}
                    placeholder="example@outlook.com"
                    className="font-mono"
                  />
                </div>

                <div>
                  <Label className="text-sm mb-2 block">邮箱密码</Label>
                  <Input
                    type="text"
                    value={manualPassword}
                    onChange={(e) => setManualPassword(e.target.value)}
                    placeholder="输入邮箱密码"
                    className="font-mono"
                  />
                </div>

                <div>
                  <Label className="text-sm mb-2 block">刷新令牌 (Refresh Token)</Label>
                  <Input
                    type="text"
                    value={manualRefreshToken}
                    onChange={(e) => setManualRefreshToken(e.target.value)}
                    placeholder="M.C526_BAY.0.U.-Cg6JZ1yR..."
                    className="font-mono text-xs"
                  />
                </div>

                <div>
                  <Label className="text-sm mb-2 block">Client ID</Label>
                  <Input
                    type="text"
                    value={manualClientId}
                    onChange={(e) => setManualClientId(e.target.value)}
                    placeholder="8b4ba9dd-3ea5-4e5f-86f1-ddba2230dcf2"
                    className="font-mono"
                  />
                </div>

                <Button
                  onClick={handleManualLogin}
                  className="w-full"
                  size="lg"
                  disabled={!manualEmail || !manualPassword || !manualRefreshToken || !manualClientId}
                >
                  <LogIn className="w-4 h-4 mr-2" />
                  登录邮箱
                </Button>

                <div className="text-xs text-muted-foreground bg-secondary/50 rounded-lg py-3 px-4">
                  提示：可以使用自动提取的邮箱信息，或输入自己的邮箱账号来反复使用
                </div>
              </TabsContent>
            </Tabs>
          </Card>

          <Card className="p-6 bg-card border-border">
            <Label className="text-base font-semibold mb-4 block">验证码接收</Label>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "flex-1 px-4 py-3 rounded-lg border font-mono text-2xl text-center font-bold tracking-wider transition-all",
                    receivingStatus === "idle" && "bg-secondary border-border text-muted-foreground",
                    receivingStatus === "receiving" && "bg-primary/10 border-primary text-primary animate-pulse",
                    receivingStatus === "received" && "bg-success/10 border-success text-success",
                    receivingStatus === "failed" && "bg-destructive/10 border-destructive text-destructive",
                  )}
                >
                  {receivingStatus === "idle" && "等待提取邮箱"}
                  {receivingStatus === "receiving" && "正在接收中..."}
                  {receivingStatus === "received" && verificationCode}
                  {receivingStatus === "failed" && "未收到验证码"}
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(verificationCode, "验证码")}
                  disabled={!verificationCode}
                  className="shrink-0"
                >
                  {copiedItem === "验证码" ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>

              {receivingStatus === "receiving" && (
                <div className="flex items-center justify-center gap-2 text-sm text-primary bg-primary/10 rounded-lg py-3 px-4">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span className="font-medium">
                    正在持续接收邮件 (已检查 {checkCount} 次，每10秒检查一次，直到收到验证码)
                  </span>
                </div>
              )}

              {receivingStatus === "idle" && (
                <p className="text-xs text-muted-foreground text-center bg-secondary/50 rounded-lg py-3 px-4">
                  提取邮箱后将自动登录并接收验证码
                </p>
              )}

              {receivingStatus === "failed" && (
                <div className="text-xs text-destructive text-center bg-destructive/10 rounded-lg py-3 px-4">
                  邮箱登录失败，请尝试重新提取邮箱或使用手动登录
                </div>
              )}

              {messages.length > 0 && (
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <Inbox className="w-4 h-4" />
                      邮件列表
                    </div>
                    <div className="flex gap-2 border-b border-border">
                      <button
                        onClick={() => {
                          setMailFolder("inbox")
                          setMessages([])
                          setCheckCount(0)
                        }}
                        className={`px-3 py-2 text-sm font-medium transition-colors ${
                          mailFolder === "inbox"
                            ? "border-b-2 border-primary text-primary"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        收件箱 ({messages.length})
                      </button>
                      <button
                        onClick={async () => {
                          setMailFolder("junk")
                          setMessages([])
                          setCheckCount(0)
                          // 立即获取垃圾邮件
                          if (emailAccount) {
                            try {
                              const response = await fetch("/api/outlook/inbox", {
                                method: "POST",
                                headers: {
                                  "Content-Type": "application/json",
                                },
                                body: JSON.stringify({
                                  refreshToken: emailAccount.refreshToken,
                                  clientId: emailAccount.clientId,
                                  folder: "junk",
                                }),
                              })
                              if (response.ok) {
                                const data = await response.json()
                                setMessages(data.messages || [])
                              }
                            } catch (error) {
                              console.error("Error fetching junk folder:", error)
                            }
                          }
                        }}
                        className={`px-3 py-2 text-sm font-medium transition-colors ${
                          mailFolder === "junk"
                            ? "border-b-2 border-primary text-primary"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        垃圾邮件
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {messages.map((message, index) => (
                      <Card key={index} className="bg-secondary/50 overflow-hidden">
                        <button
                          onClick={() => handleToggleMessage(index, message.id)} // 使用message.id而不是message.from
                          className="w-full p-3 text-left hover:bg-secondary/70 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-semibold mb-1 truncate">{message.subject}</div>
                              <div className="text-xs text-muted-foreground mb-2">来自: {message.from}</div>
                              {expandedMessageIndex !== index && (
                                <div className="text-xs line-clamp-2">{message.bodyPreview}</div>
                              )}
                            </div>
                            <div className="shrink-0">
                              {expandedMessageIndex === index ? (
                                <ChevronUp className="w-4 h-4 text-muted-foreground" />
                              ) : (
                                <ChevronDown className="w-4 h-4 text-muted-foreground" />
                              )}
                            </div>
                          </div>
                        </button>

                        {expandedMessageIndex === index && (
                          <div className="px-3 pb-3 space-y-3 border-t border-border/50 pt-3">
                            <div>
                              <div className="text-xs font-semibold text-muted-foreground mb-1">接收时间</div>
                              <div className="text-xs">
                                {new Date(message.receivedDateTime).toLocaleString("zh-CN")}
                              </div>
                            </div>

                            <div>
                              <div className="text-xs font-semibold text-muted-foreground mb-1 flex items-center gap-2">
                                完整邮件内容
                                {loadingMessageBody[index] && <RefreshCw className="w-3 h-3 animate-spin" />}
                              </div>
                              <div className="text-xs bg-background/50 rounded p-3 max-h-96 overflow-y-auto border border-border">
                                {loadingMessageBody[index] ? (
                                  <div className="text-muted-foreground text-center py-4">正在加载完整内容...</div>
                                ) : message.body ? (
                                  message.bodyType === "html" ? (
                                    <iframe
                                      srcDoc={`
                                        <!DOCTYPE html>
                                        <html>
                                          <head>
                                            <base target="_blank">
                                            <style>
                                              body { 
                                                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                                                font-size: 14px;
                                                line-height: 1.5;
                                                color: #333;
                                                background: #fff;
                                                margin: 0;
                                                padding: 8px;
                                              }
                                              a { color: #0066cc; }
                                              img { max-width: 100%; height: auto; }
                                            </style>
                                          </head>
                                          <body>${message.body}</body>
                                        </html>
                                      `}
                                      className="w-full min-h-[200px] border-0 bg-white rounded"
                                      sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
                                      title="邮件内容"
                                    />
                                  ) : (
                                    <pre className="whitespace-pre-wrap break-words text-foreground">
                                      {message.body}
                                    </pre>
                                  )
                                ) : (
                                  <div className="text-muted-foreground">{message.bodyPreview}</div>
                                )}
                              </div>
                            </div>

                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  const content = message.body || message.bodyPreview
                                  copyToClipboard(content, "邮件内容")
                                }}
                                className="w-full"
                              >
                                <Copy className="w-3 h-3 mr-1" />
                                复制内容
                              </Button>
                            </div>
                          </div>
                        )}
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <PasswordGenerator onCopy={copyToClipboard} copiedItem={copiedItem} />
        </div>
      </div>

      <Toaster />
    </div>
  )
}
