import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import * as Icons from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { Link, useLocation } from "wouter";

type DocumentWeight = 'strong' | 'preferred' | 'reference';

interface KnowledgeDocument {
  id: number;
  name: string;
  originalName: string;
  fileType: string;
  fileSize: number;
  agentId?: number;
  weight: DocumentWeight;
  status: string;
  chunkCount: number;
  errorMessage?: string;
  createdAt: string;
}

const weightLabels: Record<DocumentWeight, string> = {
  strong: '强引用',
  preferred: '优先参考',
  reference: '仅供参考',
};

const weightColors: Record<DocumentWeight, string> = {
  strong: 'bg-red-100 text-red-800',
  preferred: 'bg-blue-100 text-blue-800',
  reference: 'bg-gray-100 text-gray-800',
};

export default function KnowledgeBase() {
  const [, setLocation] = useLocation();
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState('global');
  const [selectedAgentId, setSelectedAgentId] = useState<number | undefined>();
  const [testQuery, setTestQuery] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadWeight, setUploadWeight] = useState<DocumentWeight>('preferred');

  // Queries
  const { data: agents } = trpc.agent.list.useQuery();
  const { data: globalDocs, refetch: refetchGlobal } = trpc.knowledge.list.useQuery({ agentId: undefined });
  const { data: agentDocs, refetch: refetchAgent } = trpc.knowledge.list.useQuery(
    { agentId: selectedAgentId },
    { enabled: !!selectedAgentId }
  );
  const { data: testResults, refetch: runTest } = trpc.knowledge.testSearch.useQuery(
    { query: testQuery, agentId: selectedAgentId, topK: 5 },
    { enabled: false }
  );

  // Mutations
  const uploadMutation = trpc.knowledge.upload.useMutation({
    onSuccess: () => {
      if (activeTab === 'global') {
        refetchGlobal();
      } else {
        refetchAgent();
      }
    },
  });
  const updateWeightMutation = trpc.knowledge.updateWeight.useMutation({
    onSuccess: () => {
      refetchGlobal();
      refetchAgent();
    },
  });
  const deleteMutation = trpc.knowledge.delete.useMutation({
    onSuccess: () => {
      refetchGlobal();
      refetchAgent();
    },
  });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      setLocation("/email-login");
    } else if (!authLoading && isAuthenticated && user?.role !== "admin") {
      setLocation("/");
    }
  }, [authLoading, isAuthenticated, user, setLocation]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size
    if (file.size > 20 * 1024 * 1024) {
      alert('文件大小不能超过20MB');
      return;
    }

    // Check file type
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
    ];
    const allowedExtensions = ['.pdf', '.docx', '.xlsx', '.txt'];
    const ext = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
    
    if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(ext)) {
      alert('仅支持 PDF、Word、Excel、TXT 格式');
      return;
    }

    // Read file as base64
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1];
      
      try {
        await uploadMutation.mutateAsync({
          fileName: file.name,
          fileType: file.type || 'application/octet-stream',
          fileData: base64,
          agentId: activeTab === 'agent' ? selectedAgentId : undefined,
          weight: uploadWeight,
        });
        alert('文档上传成功，正在处理中...');
      } catch (error) {
        alert('上传失败: ' + (error as Error).message);
      }
    };
    reader.readAsDataURL(file);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleWeightChange = async (docId: number, weight: DocumentWeight) => {
    try {
      await updateWeightMutation.mutateAsync({ id: docId, weight });
    } catch (error) {
      alert('更新失败: ' + (error as Error).message);
    }
  };

  const handleDelete = async (docId: number) => {
    if (!confirm('确定要删除这个文档吗？')) return;
    
    try {
      await deleteMutation.mutateAsync({ id: docId });
    } catch (error) {
      alert('删除失败: ' + (error as Error).message);
    }
  };

  const handleTest = () => {
    if (!testQuery.trim()) {
      alert('请输入测试问题');
      return;
    }
    runTest();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const renderDocumentList = (docs: KnowledgeDocument[] | undefined) => {
    if (!docs || docs.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          <Icons.FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>暂无文档</p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {docs.map((doc) => (
          <div key={doc.id} className="flex items-center justify-between p-4 border rounded-lg bg-card">
            <div className="flex items-center gap-3">
              <Icons.FileText className="w-8 h-8 text-blue-500" />
              <div>
                <p className="font-medium">{doc.originalName}</p>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>{formatFileSize(doc.fileSize)}</span>
                  <span>•</span>
                  <span>{doc.chunkCount} 个切片</span>
                  <span>•</span>
                  <span className={`px-2 py-0.5 rounded text-xs ${
                    doc.status === 'completed' ? 'bg-green-100 text-green-800' :
                    doc.status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                    doc.status === 'failed' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {doc.status === 'completed' ? '已完成' :
                     doc.status === 'processing' ? '处理中' :
                     doc.status === 'failed' ? '失败' : '待处理'}
                  </span>
                </div>
                {doc.errorMessage && (
                  <p className="text-sm text-red-500 mt-1">{doc.errorMessage}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Select
                value={doc.weight}
                onValueChange={(value) => handleWeightChange(doc.id, value as DocumentWeight)}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="strong">强引用</SelectItem>
                  <SelectItem value="preferred">优先参考</SelectItem>
                  <SelectItem value="reference">仅供参考</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDelete(doc.id)}
                className="text-red-500 hover:text-red-700"
              >
                <Icons.Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || user.role !== "admin") {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b glass-effect sticky top-0 z-10">
        <div className="container py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/admin">
                <Icons.ArrowLeft className="w-5 h-5" />
              </Link>
            </Button>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              知识库管理
            </h1>
          </div>
        </div>
      </header>

      <div className="container py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="global">全局知识库</TabsTrigger>
            <TabsTrigger value="agent">Agent专属知识库</TabsTrigger>
            <TabsTrigger value="test">问答测试</TabsTrigger>
          </TabsList>

          {/* Global Knowledge Base */}
          <TabsContent value="global">
            <Card>
              <CardHeader>
                <CardTitle>全局知识库</CardTitle>
                <CardDescription>所有Agent共享的知识文档</CardDescription>
              </CardHeader>
              <CardContent>
                {/* Upload Section */}
                <div className="flex items-center gap-4 mb-6 p-4 border-2 border-dashed rounded-lg">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.docx,.xlsx,.txt"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <Select value={uploadWeight} onValueChange={(v) => setUploadWeight(v as DocumentWeight)}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="strong">强引用</SelectItem>
                      <SelectItem value="preferred">优先参考</SelectItem>
                      <SelectItem value="reference">仅供参考</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadMutation.isPending}
                  >
                    {uploadMutation.isPending ? (
                      <Icons.Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Icons.Upload className="w-4 h-4 mr-2" />
                    )}
                    上传文档
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    支持 PDF、Word、Excel、TXT，最大 20MB
                  </span>
                </div>

                {/* Document List */}
                {renderDocumentList(globalDocs as KnowledgeDocument[] | undefined)}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Agent Knowledge Base */}
          <TabsContent value="agent">
            <Card>
              <CardHeader>
                <CardTitle>Agent专属知识库</CardTitle>
                <CardDescription>为特定Agent配置专属知识文档</CardDescription>
              </CardHeader>
              <CardContent>
                {/* Agent Selector */}
                <div className="mb-6">
                  <Label>选择Agent</Label>
                  <Select
                    value={selectedAgentId?.toString() || ''}
                    onValueChange={(v) => setSelectedAgentId(parseInt(v))}
                  >
                    <SelectTrigger className="w-64 mt-2">
                      <SelectValue placeholder="请选择Agent" />
                    </SelectTrigger>
                    <SelectContent>
                      {agents?.map((agent) => (
                        <SelectItem key={agent.id} value={agent.id.toString()}>
                          {agent.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedAgentId ? (
                  <>
                    {/* Upload Section */}
                    <div className="flex items-center gap-4 mb-6 p-4 border-2 border-dashed rounded-lg">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.docx,.xlsx,.txt"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                      <Select value={uploadWeight} onValueChange={(v) => setUploadWeight(v as DocumentWeight)}>
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="strong">强引用</SelectItem>
                          <SelectItem value="preferred">优先参考</SelectItem>
                          <SelectItem value="reference">仅供参考</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadMutation.isPending}
                      >
                        {uploadMutation.isPending ? (
                          <Icons.Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Icons.Upload className="w-4 h-4 mr-2" />
                        )}
                        上传文档
                      </Button>
                    </div>

                    {/* Document List */}
                    {renderDocumentList(agentDocs as KnowledgeDocument[] | undefined)}
                  </>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    请先选择一个Agent
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Test Tab */}
          <TabsContent value="test">
            <Card>
              <CardHeader>
                <CardTitle>问答测试</CardTitle>
                <CardDescription>测试知识库检索效果</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label>选择Agent（可选）</Label>
                    <Select
                      value={selectedAgentId?.toString() || 'global'}
                      onValueChange={(v) => setSelectedAgentId(v === 'global' ? undefined : parseInt(v))}
                    >
                      <SelectTrigger className="w-64 mt-2">
                        <SelectValue placeholder="全局知识库" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="global">全局知识库</SelectItem>
                        {agents?.map((agent) => (
                          <SelectItem key={agent.id} value={agent.id.toString()}>
                            {agent.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>测试问题</Label>
                    <Textarea
                      value={testQuery}
                      onChange={(e) => setTestQuery(e.target.value)}
                      placeholder="输入测试问题..."
                      className="mt-2"
                      rows={3}
                    />
                  </div>

                  <Button onClick={handleTest}>
                    <Icons.Search className="w-4 h-4 mr-2" />
                    测试检索
                  </Button>

                  {/* Test Results */}
                  {testResults && testResults.length > 0 && (
                    <div className="mt-6 space-y-4">
                      <h3 className="font-semibold">检索结果</h3>
                      {testResults.map((result, index) => (
                        <div key={index} className="p-4 border rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium">{result.documentName}</span>
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded text-xs ${weightColors[result.weight as DocumentWeight]}`}>
                                {weightLabels[result.weight as DocumentWeight]}
                              </span>
                              <span className="text-sm text-muted-foreground">
                                相似度: {result.similarityScore.toFixed(1)}%
                              </span>
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-3">
                            {result.content}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  {testResults && testResults.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      未找到相关内容
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
