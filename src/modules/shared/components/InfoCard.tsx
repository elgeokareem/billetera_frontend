import { Card, Flex, Text } from "@mantine/core";

interface InfoCardProps {
  title: string;
  body: string | number;
  subtitle: string;
  icon: React.ReactNode;
}
export function InfoCard({ body, icon, subtitle, title }: InfoCardProps) {
  return (
    <Card padding="lg" radius="md" withBorder style={{ width: "340px" }}>
      <Flex justify="space-between">
        <Text>{title}</Text>
        {icon}
      </Flex>
      <Text mt={5}>{body}</Text>
      <Text mt={-3} size="12px">
        {subtitle}
      </Text>
    </Card>
  );
}
